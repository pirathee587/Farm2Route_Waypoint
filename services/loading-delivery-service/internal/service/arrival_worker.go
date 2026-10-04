package service

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ArrivalWorker struct {
	pool     *pgxpool.Pool
	logger   *slog.Logger
	stop     chan struct{}
	wg       sync.WaitGroup
	interval time.Duration
}

func windowReached(now, opens time.Time) bool { return !now.Before(opens) }
func NewArrivalWorker(pool *pgxpool.Pool, logger *slog.Logger) *ArrivalWorker {
	return &ArrivalWorker{pool: pool, logger: logger, stop: make(chan struct{}), interval: 30 * time.Second}
}
func (w *ArrivalWorker) Start() {
	w.wg.Add(1)
	go func() {
		defer w.wg.Done()
		ticker := time.NewTicker(w.interval)
		defer ticker.Stop()
		for {
			select {
			case <-w.stop:
				return
			case <-ticker.C:
				ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
				if _, err := w.Process(ctx, time.Now()); err != nil {
					w.logger.Warn("arrival transition failed", "error", err)
				}
				cancel()
			}
		}
	}()
}
func (w *ArrivalWorker) Stop() {
	select {
	case <-w.stop:
	default:
		close(w.stop)
	}
	w.wg.Wait()
}

func (w *ArrivalWorker) Process(ctx context.Context, now time.Time) (int, error) {
	tx, err := w.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	rows, err := tx.Query(ctx, `SELECT ls.stop_id,t.driver_id::text,ls.outlet_name FROM public.load_stops ls JOIN public.trips t ON t.trip_id=ls.trip_id
	 WHERE ls.arrival_status='WAITING_FOR_WINDOW' AND
	 ((t.delivery_date+COALESCE((SELECT MIN(o.window_open) FROM public.allocations a JOIN public.orders o ON o.order_id=a.order_id WHERE a.trip_id=t.trip_id AND o.outlet_id=ls.outlet_id AND a.status='ALLOCATED'),TIME '00:00')) AT TIME ZONE 'Asia/Colombo') <= $1
	 ORDER BY ls.arrived_at FOR UPDATE OF ls SKIP LOCKED LIMIT 50`, now)
	if err != nil {
		return 0, err
	}
	type row struct{ id, user, name string }
	claimed := []row{}
	for rows.Next() {
		var x row
		if err := rows.Scan(&x.id, &x.user, &x.name); err != nil {
			rows.Close()
			return 0, err
		}
		claimed = append(claimed, x)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return 0, err
	}
	rows.Close()
	for _, x := range claimed {
		if _, err := tx.Exec(ctx, `UPDATE public.load_stops SET arrival_status='ARRIVED',window_notification_sent=TRUE,updated_at=$2 WHERE stop_id=$1`, x.id, now); err != nil {
			return 0, err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO public.notifications(notification_id,user_id,event_type,title,body,payload_json,created_at) VALUES(uuid_generate_v5($1::uuid,'window-open'),$2,'DELIVERY_WINDOW_OPEN','Delivery window is open',$3,json_build_object('stop_id',$1)::text,$4) ON CONFLICT(notification_id) DO NOTHING`, x.id, x.user, fmt.Sprintf("The delivery window for %s is now open.", x.name), now); err != nil {
			return 0, err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO public.outbox_events(id,aggregate_type,aggregate_id,event_type,payload,status,created_at) VALUES(uuid_generate_v5($1::uuid,'window-open-event'),'DELIVERY',$1,'DELIVERY_WINDOW_OPEN',jsonb_build_object('stop_id',$1,'driver_id',$2,'title','Delivery window is open','body',$3),'PENDING',$4) ON CONFLICT(id) DO NOTHING`, x.id, x.user, fmt.Sprintf("The delivery window for %s is now open.", x.name), now); err != nil {
			return 0, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return len(claimed), nil
}

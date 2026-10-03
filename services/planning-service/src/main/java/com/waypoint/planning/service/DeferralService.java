package com.waypoint.planning.service;

import com.waypoint.planning.model.PlanningModels.*;
import com.waypoint.planning.repository.*;
import com.waypoint.planning.messaging.PlanningEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;import java.util.*;

@Service
public class DeferralService {
    private final ReferenceRepository refs; private final PlanningRepository repo; private final PlanningEventPublisher events;
    public DeferralService(ReferenceRepository refs,PlanningRepository repo,PlanningEventPublisher events){this.refs=refs;this.repo=repo;this.events=events;}
    @Transactional public UUID defer(UUID orderId,DeferralRequest r,String userId){
        var o=refs.getOrder(orderId); LocalDate retry=r.retryDate()==null?o.preferredDate().plusDays(1):r.retryDate();
        String type=normalize(r.constraintType()); UUID id=repo.defer(orderId,o.preferredDate(),r.reason(),type,retry,userId); events.orderDeferred(orderId,r.reason(),type,retry);return id;
    }
    @Transactional public void returnToPlanning(UUID orderId){refs.getOrder(orderId);repo.returnToPlanning(orderId);}
    public List<DeferralView> list(LocalDate d){return repo.listDeferrals(d);}
    private String normalize(String s){if(s==null)return "NONE";return switch(s.toUpperCase()){case "TEMPERATURE"->"TEMP";case "DELIVERY_WINDOW"->"WINDOW";case "VEHICLE","DISTRICT","FUEL"->"NONE";default->s.toUpperCase();};}
}

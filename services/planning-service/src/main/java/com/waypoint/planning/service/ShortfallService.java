package com.waypoint.planning.service;

import com.waypoint.planning.model.PlanningModels.*;
import com.waypoint.planning.repository.*;
import org.springframework.stereotype.Service;
import java.time.*;import java.util.*;

@Service
public class ShortfallService {
    private final ReferenceRepository refs;private final PlanningRepository repo;private final SuggestionService suggestions;
    public ShortfallService(ReferenceRepository refs,PlanningRepository repo,SuggestionService suggestions){this.refs=refs;this.repo=repo;this.suggestions=suggestions;}
    public ShortfallSummary get(LocalDate date){
        var all=refs.listPlanningOrders(date);var s=suggestions.suggest(date);Set<UUID>a=new HashSet<>(repo.allocatedOrderIds(date));
        List<ShortfallItem> items=s.unallocatedOrderIds().stream().map(id->{var o=refs.getOrder(id);return new ShortfallItem(id,o.outletName(),"No feasible trip found with current fleet and constraints","NONE",date.plusDays(1));}).toList();
        return new ShortfallSummary(all.size(),all.size()-items.size(),items.size(),items);
    }
}

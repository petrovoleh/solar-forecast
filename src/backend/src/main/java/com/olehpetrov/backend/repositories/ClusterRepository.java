package com.olehpetrov.backend.repositories;

import com.olehpetrov.backend.models.Cluster;
import com.olehpetrov.backend.models.Panel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClusterRepository extends MongoRepository<Cluster, String> {
    List<Cluster> findByUserId(String userId);
    Page<Cluster> findAll(Pageable pageable);

}

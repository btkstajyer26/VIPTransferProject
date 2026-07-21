package com.btk.staj.VIPTransferProject.repository;

import com.btk.staj.VIPTransferProject.entity.EntityTranslation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EntityTranslationRepository extends JpaRepository<EntityTranslation, Long> {
    Optional<EntityTranslation> findByEntityTypeAndEntityIdAndFieldNameAndLangCode(String entityType, Long entityId, String fieldName, String langCode);
    List<EntityTranslation> findByEntityTypeAndEntityIdAndLangCode(String entityType, Long entityId, String langCode);
    List<EntityTranslation> findByEntityTypeAndEntityId(String entityType, Long entityId);
}

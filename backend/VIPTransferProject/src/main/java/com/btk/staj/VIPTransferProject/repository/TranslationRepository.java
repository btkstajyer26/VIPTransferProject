package com.btk.staj.VIPTransferProject.repository;

import com.btk.staj.VIPTransferProject.entity.Translation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TranslationRepository extends JpaRepository<Translation, Long> {
    Optional<Translation> findByTransKeyAndLangCode(String transKey, String langCode);
    List<Translation> findByLangCode(String langCode);
}

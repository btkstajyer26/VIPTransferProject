package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.campaign.CampaignRequestDto;
import com.btk.staj.VIPTransferProject.entity.Campaign;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.enums.DiscountType;
import com.btk.staj.VIPTransferProject.event.CampaignPublishedEvent;
import com.btk.staj.VIPTransferProject.repository.CampaignRepository;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CampaignServiceTest {

    @Test
    void create_publishesCampaignEventAfterSaving() {
        CampaignRepository campaignRepository = mock(CampaignRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        ApplicationEventPublisher eventPublisher =
                mock(ApplicationEventPublisher.class);
        CampaignService service = new CampaignService(
                campaignRepository,
                userRepository,
                eventPublisher
        );

        User admin = User.builder().id(3L).build();
        when(userRepository.findById(3L)).thenReturn(Optional.of(admin));
        when(campaignRepository.save(any(Campaign.class)))
                .thenAnswer(invocation -> {
                    Campaign campaign = invocation.getArgument(0);
                    campaign.setId(21L);
                    return campaign;
                });

        service.create(request(), 3L);

        ArgumentCaptor<CampaignPublishedEvent> eventCaptor =
                ArgumentCaptor.forClass(CampaignPublishedEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        assertThat(eventCaptor.getValue().campaignId()).isEqualTo(21L);
    }

    private CampaignRequestDto request() {
        CampaignRequestDto request = new CampaignRequestDto();
        request.setCode("YAZ20");
        request.setName("Yaz İndirimi");
        request.setDescription("Tüm transferlerde geçerli.");
        request.setDiscountType(DiscountType.PERCENTAGE);
        request.setDiscountValue(new BigDecimal("20.00"));
        request.setValidFrom(
                OffsetDateTime.parse("2026-08-01T00:00:00+03:00")
        );
        request.setValidTo(
                OffsetDateTime.parse("2026-08-31T23:59:00+03:00")
        );
        return request;
    }
}

import { Pressable, Text, View } from 'react-native';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDateTime } from '../../../utils/formatDateTime';
import {
  CAMPAIGN_VALIDITY_LABELS,
  campaignTypeLabel,
  campaignValidity,
} from '../../../utils/adminCampaign';

export default function AdminCampaignCard({ campaign, onDelete, onDetail, onEdit, deleting, styles }) {
  const validity = campaignValidity(campaign);
  const discount = campaign.discountType === 'PERCENTAGE'
    ? `%${Number(campaign.discountValue).toLocaleString('tr-TR')}`
    : formatCurrency(campaign.discountValue, 'TRY');
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitleArea}>
          <Text style={styles.cardTitle}>{campaign.name}</Text>
          <Text style={styles.cardSubtitle}>{campaign.code}</Text>
        </View>
        <View style={[styles.badge, campaign.active ? styles.badgeActive : styles.badgePassive]}>
          <Text style={[styles.badgeText, campaign.active ? styles.badgeTextActive : styles.badgeTextPassive]}>
            {CAMPAIGN_VALIDITY_LABELS[validity]}
          </Text>
        </View>
      </View>
      {campaign.description ? <Text style={[styles.metadataText, { marginTop: 10 }]}>{campaign.description}</Text> : null}
      <View style={styles.metadata}>
        <Text style={styles.metadataText}>{campaignTypeLabel(campaign.discountType)}: <Text style={styles.metadataStrong}>{discount}</Text></Text>
        <Text style={styles.metadataText}>{formatDateTime(campaign.validFrom)} – {formatDateTime(campaign.validTo)}</Text>
        <Text style={styles.metadataText}>Kullanım: {campaign.usedCount}{campaign.maxUses != null ? ` / ${campaign.maxUses}` : ' / Sınırsız'}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={onDetail} style={styles.actionButton}><Text style={styles.actionText}>Detay</Text></Pressable>
        <Pressable onPress={onEdit} style={styles.actionButton}><Text style={styles.actionText}>Düzenle</Text></Pressable>
        <Pressable disabled={deleting} onPress={onDelete} style={[styles.actionButton, styles.dangerButton, deleting && styles.disabled]}>
          <Text style={[styles.actionText, styles.dangerText]}>{deleting ? 'Siliniyor...' : 'Sil'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

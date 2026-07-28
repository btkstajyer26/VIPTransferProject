import { StyleSheet } from 'react-native';

export function createAdminReservationStyles(theme) {
  const statusStyle = (backgroundColor, color) => ({ backgroundColor, color });
  const pending = statusStyle('#FEF3C7', '#92400E');
  const assigned = statusStyle('#DBEAFE', '#1E40AF');
  const completed = statusStyle('#DCFCE7', '#166534');
  const cancelled = statusStyle('#FEE2E2', '#991B1B');
  const noShow = statusStyle('#E5E7EB', '#374151');

  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    listContent: { padding: 16, paddingBottom: 40 },
    headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heading: { color: theme.text, fontSize: 24, fontWeight: '800' },
    count: { color: theme.textSecondary, fontSize: 13, fontWeight: '700' },
    search: {
      minHeight: 46, marginTop: 14, paddingHorizontal: 14, borderWidth: 1,
      borderColor: theme.border, borderRadius: 10, color: theme.text,
      backgroundColor: theme.inputBackground,
    },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 4 },
    filter: {
      paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1,
      borderColor: theme.border, borderRadius: 999, backgroundColor: theme.surface,
    },
    filterSelected: { borderColor: theme.accent, backgroundColor: theme.surfaceSecondary },
    filterText: { color: theme.textSecondary, fontSize: 12, fontWeight: '700' },
    filterTextSelected: { color: theme.accent },
    card: {
      marginTop: 12, padding: 15, borderWidth: 1, borderColor: theme.border,
      borderRadius: 12, backgroundColor: theme.surface,
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
    titleArea: { flex: 1 },
    reference: { color: theme.text, fontSize: 17, fontWeight: '800' },
    date: { marginTop: 4, color: theme.textSecondary, fontSize: 12 },
    statusBadge: { maxWidth: 130, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
    statusBadgeText: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
    statusPENDING: { backgroundColor: pending.backgroundColor }, statusPENDINGText: { color: pending.color },
    statusASSIGNED: { backgroundColor: assigned.backgroundColor }, statusASSIGNEDText: { color: assigned.color },
    statusCOMPLETED: { backgroundColor: completed.backgroundColor }, statusCOMPLETEDText: { color: completed.color },
    statusCANCELLED: { backgroundColor: cancelled.backgroundColor }, statusCANCELLEDText: { color: cancelled.color },
    statusNO_SHOW: { backgroundColor: noShow.backgroundColor }, statusNO_SHOWText: { color: noShow.color },
    route: { marginTop: 14, paddingLeft: 11, borderLeftWidth: 2, borderLeftColor: theme.accent },
    routeLabel: { color: theme.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    routeText: { marginTop: 2, color: theme.text, fontSize: 13, lineHeight: 18 },
    routeArrow: { color: theme.accent, fontSize: 15, fontWeight: '800' },
    metaGrid: { marginTop: 12, gap: 5 },
    metaText: { color: theme.textSecondary, fontSize: 13 },
    price: { color: theme.text, fontSize: 15, fontWeight: '800' },
    detailButton: {
      alignItems: 'center', marginTop: 13, paddingVertical: 10,
      borderWidth: 1, borderColor: theme.accent, borderRadius: 8,
    },
    detailButtonText: { color: theme.accent, fontSize: 13, fontWeight: '800' },
    state: { alignItems: 'center', justifyContent: 'center', padding: 42 },
    stateTitle: { color: theme.text, fontSize: 17, fontWeight: '800', textAlign: 'center' },
    stateText: { marginTop: 8, color: theme.textSecondary, lineHeight: 20, textAlign: 'center' },
    retry: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 8, backgroundColor: theme.accent },
    retryText: { color: theme.buttonText, fontWeight: '800' },
    detailContent: { padding: 16, paddingBottom: 44 },
    detailHeader: {
      padding: 16, borderWidth: 1, borderColor: theme.border,
      borderRadius: 12, backgroundColor: theme.surface,
    },
    detailReference: { color: theme.text, fontSize: 22, fontWeight: '800' },
    detailStatusRow: { flexDirection: 'row', marginTop: 10 },
    section: {
      marginTop: 13, padding: 15, borderWidth: 1, borderColor: theme.border,
      borderRadius: 12, backgroundColor: theme.surface,
    },
    sectionTitle: { color: theme.text, fontSize: 16, fontWeight: '800' },
    sectionHint: { marginTop: 7, color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
    infoRow: { marginTop: 9 },
    infoLabel: { color: theme.textSecondary, fontSize: 11, fontWeight: '700' },
    infoValue: { marginTop: 3, color: theme.text, fontSize: 14, lineHeight: 20 },
    actionButton: { alignItems: 'center', marginTop: 14, paddingVertical: 13, borderRadius: 9, backgroundColor: theme.accent },
    actionText: { color: theme.buttonText, fontWeight: '800' },
    deleteButton: {
      alignItems: 'center', marginTop: 10, paddingVertical: 13,
      borderWidth: 1, borderColor: theme.error, borderRadius: 9,
    },
    deleteText: { color: theme.error, fontWeight: '800' },
    disabled: { opacity: 0.45 },
    errorBox: { marginTop: 12, color: theme.error, lineHeight: 20 },
    historyError: { marginTop: 8, color: theme.error },
    timeline: { marginTop: 10 },
    timelineItem: { flexDirection: 'row', minHeight: 68 },
    timelineDot: { width: 10, height: 10, marginTop: 5, marginRight: 12, borderRadius: 5, backgroundColor: theme.accent },
    timelineContent: { flex: 1, paddingBottom: 16, borderLeftColor: theme.border },
    timelineStatus: { color: theme.text, fontSize: 13, fontWeight: '800' },
    timelineDate: { marginTop: 4, color: theme.textSecondary, fontSize: 12 },
    timelineNote: { marginTop: 4, color: theme.textSecondary, fontSize: 12, lineHeight: 17 },
    modalOverlay: { flex: 1, justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,0.55)' },
    modalCard: { padding: 18, borderRadius: 14, backgroundColor: theme.surface },
    modalOption: { marginTop: 9, padding: 13, borderWidth: 1, borderColor: theme.border, borderRadius: 9 },
    modalOptionText: { color: theme.text, fontWeight: '700' },
    modalCancel: { alignItems: 'center', marginTop: 14, padding: 12 },
    modalCancelText: { color: theme.textSecondary, fontWeight: '700' },
  });
}

import { Text, View } from 'react-native';

export function StepIndicator({ styles }) {
  const steps = ['Rota', 'Araç', 'Bilgiler', 'Onay'];

  return (
    <View accessibilityLabel="Rezervasyon adımları, birinci adım Rota" style={styles.stepIndicator}>
      {steps.map((step, index) => (
        <View key={step} style={styles.stepItemContainer}>
          <View style={styles.stepItem}>
            <View style={[styles.stepDot, index === 0 && styles.activeStepDot]}>
              <Text style={[styles.stepNumber, index === 0 && styles.activeStepNumber]}>{index + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, index === 0 && styles.activeStepLabel]}>{step}</Text>
          </View>
          {index < steps.length - 1 ? <View style={styles.stepLine} /> : null}
        </View>
      ))}
    </View>
  );
}

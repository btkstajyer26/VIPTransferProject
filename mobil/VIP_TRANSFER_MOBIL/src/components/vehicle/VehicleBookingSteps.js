import { Text, View } from 'react-native';

const STEPS = ['Rota', 'Araç', 'Bilgiler', 'Onay'];

export default function VehicleBookingSteps({ activeStep = 1, styles }) {
  return (
    <View
      accessibilityLabel={`Rezervasyon adımları, ${activeStep + 1}. adım ${STEPS[activeStep]}`}
      style={styles.stepIndicator}
    >
      {STEPS.map((step, index) => {
        const isCompleted = index < activeStep;
        const isActive = index === activeStep;

        return (
          <View key={step} style={styles.stepItemContainer}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  isCompleted && styles.completedStepDot,
                  isActive && styles.activeStepDot,
                ]}
              >
                <Text
                  style={[
                    styles.stepNumber,
                    (isCompleted || isActive) && styles.highlightedStepNumber,
                  ]}
                >
                  {isCompleted ? '✓' : index + 1}
                </Text>
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isCompleted && styles.completedStepLabel,
                  isActive && styles.activeStepLabel,
                ]}
              >
                {step}
              </Text>
            </View>
            {index < STEPS.length - 1 ? (
              <View style={[styles.stepLine, isCompleted && styles.completedStepLine]} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

interface BudgetRingProps {
  spent: number;
  budget: number;
  size?: number;
  strokeWidth?: number;
  primaryColor: string;
  trackColor: string;
  destructiveColor: string;
  children?: React.ReactNode;
}

export function BudgetRing({
  spent,
  budget,
  size = 180,
  strokeWidth = 14,
  primaryColor,
  trackColor,
  destructiveColor,
  children,
}: BudgetRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = budget > 0 ? Math.min(spent / budget, 1) : 0;
  const isOverBudget = budget > 0 && spent > budget;
  const progressColor = isOverBudget ? destructiveColor : primaryColor;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2},${size / 2}`}>
          {/* Background track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress arc */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      {/* Center content */}
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

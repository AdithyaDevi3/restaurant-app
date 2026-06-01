export const colors = {
  background: '#1A1A2E',
  accent: '#F5A623',
  text: '#FFF8F0',
  textDark: '#333333',
  border: '#E0E0E0',
  cardBackground: '#FFFFFF',
  successGreen: '#4CAF50',
  warningOrange: '#FF9800',
  errorRed: '#F44336',
  disabledGray: '#9E9E9E',
  skeletonGray: '#E0E0E0',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const typography = {
  heading1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  heading2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  heading3: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySemibold: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  captionSemibold: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
};

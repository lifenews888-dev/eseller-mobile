import { Platform, type ViewStyle } from 'react-native';

interface ShadowOptions {
  color?: string;
  x?: number;
  y?: number;
  blur?: number;
  opacity?: number;
  elevation?: number;
}

function toAlphaColor(color: string, opacity: number): string {
  if (color === 'black') return `rgb(0 0 0 / ${opacity})`;
  if (!color.startsWith('#')) return color;

  const hex = color.length === 4
    ? color.slice(1).split('').map((part) => `${part}${part}`).join('')
    : color.slice(1);

  if (hex.length !== 6) return color;

  const value = Number.parseInt(hex, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  return `rgb(${red} ${green} ${blue} / ${opacity})`;
}

export function shadowStyle({
  color = 'black',
  x = 0,
  y = 2,
  blur = 8,
  opacity = 0.16,
  elevation = 4,
}: ShadowOptions = {}): ViewStyle {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `${x}px ${y}px ${blur}px ${toAlphaColor(color, opacity)}`,
    } as ViewStyle;
  }

  return {
    shadowColor: color,
    shadowOffset: { width: x, height: y },
    shadowOpacity: opacity,
    shadowRadius: blur,
    elevation,
  };
}

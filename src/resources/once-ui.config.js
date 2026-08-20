const style = {
  theme: 'light',
  neutral: 'gray',
  brand: 'blue',
  accent: 'indigo',
  solid: 'contrast',
  solidStyle: 'flat',
  border: 'playful',
  surface: 'filled',
  transition: 'all',
  scaling: '100',
};

const dataStyle = {
  variant: 'gradient',
  mode: 'categorical',
  height: 24,
  axis: {
    stroke: 'var(--neutral-alpha-weak)',
  },
  tick: {
    fill: 'var(--neutral-on-background-weak)',
    fontSize: 11,
    line: false,
  },
};

module.exports = { style, dataStyle };

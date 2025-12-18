export const motionTokens = {
  duration: {
    micro: 0.16,
    ui: 0.28,
    panel: 0.38,
    chart: 0.75,
  },
  easing: {
    standard: [0.2, 0.8, 0.2, 1],
    emphasis: [0.16, 1, 0.3, 1],
    linear: [0, 0, 1, 1],
  },
  distance: {
    card: 12,
    hover: -1,
  },
  stagger: {
    children: 0.05,
    delay: 0.08,
  },
};

export const presets = {
  page: {
    hidden: { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: motionTokens.duration.ui,
        ease: motionTokens.easing.standard,
        staggerChildren: motionTokens.stagger.children,
        delayChildren: motionTokens.stagger.delay,
      },
    },
    exit: {
      opacity: 0,
      y: 8,
      transition: { duration: motionTokens.duration.ui, ease: motionTokens.easing.standard },
    },
  },
  card: {
    hidden: { opacity: 0, y: motionTokens.distance.card },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: motionTokens.duration.ui, ease: motionTokens.easing.standard },
    },
  },
  chart: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { duration: motionTokens.duration.chart, ease: motionTokens.easing.linear },
    },
  },
  hover: { y: -1, transition: { duration: motionTokens.duration.micro, ease: motionTokens.easing.standard } },
  press: { scale: 0.98, transition: { duration: motionTokens.duration.micro, ease: motionTokens.easing.standard } },
};

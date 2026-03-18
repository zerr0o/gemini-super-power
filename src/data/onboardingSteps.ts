import type { Component } from 'vue'
import { Settings, Type, Move, Image, GitBranch, Brush, Layers, Download } from 'lucide-vue-next'

export interface OnboardingStep {
  target: string
  tab?: string
  sidebarTab?: string
  title: string
  description: string
  icon?: Component
  media?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  optional?: boolean
}

export const onboardingSteps: OnboardingStep[] = [
  {
    target: '[data-tour="api-key"]',
    tab: 'settings',
    title: 'Set up your API key',
    description: 'First, paste your Gemini API key here. You can get one free from Google AI Studio.',
    icon: Settings,
    position: 'left',
  },
  {
    target: '[data-tour="prompt"]',
    tab: 'generation',
    sidebarTab: 'prompt',
    title: 'Describe what you want',
    description: 'Enter your prompt here. Be specific about what to change — and what NOT to change: "don\'t change background", "don\'t change position", "don\'t change anything except the hat".',
    icon: Type,
    position: 'left',
  },
  {
    target: '[data-tour="canvas"]',
    tab: 'generation',
    title: 'Draw your edit zone',
    description: 'Select the area you want to modify. Only this region will be regenerated.',
    icon: Move,
    position: 'right',
  },
  {
    target: '[data-tour="references"]',
    tab: 'generation',
    sidebarTab: 'prompt',
    title: 'Use references',
    description: 'Ref 1 can be the selection itself. If left empty, it auto-falls back to the active image. Add more references to guide style or content.',
    icon: Image,
    position: 'left',
  },
  {
    target: '[data-tour="history"]',
    tab: 'history',
    title: 'Branch your history',
    description: 'Each generation creates a new node. Try different prompts from the same starting point to explore variations — it\'s a tree, not a line.',
    icon: GitBranch,
    position: 'bottom',
  },
  {
    target: '[data-tour="mask-brush"]',
    tab: 'generation',
    sidebarTab: 'mask',
    title: 'Blend with masks (essential!)',
    description: 'After generating, use the mask brush to hide the hard edges around your edit zone. This removes the "frame effect" and keeps only the main element with a smooth progressive blend. X to toggle Hide/Reveal, Z to preview.',
    icon: Brush,
    position: 'left',
  },
  {
    target: '[data-tour="mask-studio"]',
    tab: 'masks',
    title: 'Refine masks across layers',
    description: 'For fine control, use the dedicated Mask Studio. Edit masks for any layer in your branch.',
    icon: Layers,
    position: 'bottom',
    optional: true,
  },
  {
    target: '[data-tour="export"]',
    tab: 'generation',
    title: 'Export your work',
    description: 'Export as PNG, a layer package with manifest, or a multi-layer PSD for Photoshop.',
    icon: Download,
    position: 'bottom',
  },
]

// Display and auto-research order supplied by the current tiered technology planning list.
// Entries absent from the normalized catalog are intentionally skipped by the sorter.
export const technologyOrder = [
  'electronics', 'steam-power',
  'automation-science-pack',
  'automation', 'electric-mining-drill', 'fast-inserter', 'gun-turret', 'lamp', 'logistic-science-pack', 'logistics', 'military', 'radar', 'repair-pack', 'steel-processing', 'stone-wall',
  'advanced-material-processing', 'automation-2', 'circuit-network', 'electric-energy-distribution-1', 'engine', 'heavy-armor', 'landfill', 'logistics-2', 'military-2', 'physical-projectile-damage-1', 'solar-energy', 'steel-axe', 'toolbelt', 'weapon-shooting-speed-1',
  'automobilism', 'concrete', 'fluid-handling', 'gate', 'military-science-pack', 'physical-projectile-damage-2', 'railway', 'research-speed-1', 'stronger-explosives-1', 'weapon-shooting-speed-2',
  'automated-rail-transportation', 'defender', 'fluid-wagon', 'oil-gathering', 'physical-projectile-damage-3', 'research-speed-2', 'stronger-explosives-2', 'weapon-shooting-speed-3',
  'follower-robot-count-1', 'oil-processing', 'physical-projectile-damage-4', 'weapon-shooting-speed-4',
  'flammables', 'follower-robot-count-2', 'plastics', 'sulfur-processing',
  'advanced-circuit', 'battery', 'explosives', 'flamethrower',
  'bulk-inserter', 'chemical-science-pack', 'cliff-explosives', 'electric-energy-accumulators', 'land-mine', 'mining-productivity-1', 'modular-armor', 'modules', 'refined-flammables-1', 'rocketry',
  'advanced-combinators', 'advanced-material-processing-2', 'advanced-oil-processing', 'braking-force-1', 'efficiency-module', 'electric-energy-distribution-2', 'follower-robot-count-3', 'inserter-capacity-bonus-1', 'laser', 'low-density-structure', 'military-3', 'mining-productivity-2', 'physical-projectile-damage-5', 'processing-unit', 'productivity-module', 'refined-flammables-2', 'research-speed-3', 'solar-panel-equipment', 'speed-module', 'stronger-explosives-3', 'uranium-mining', 'weapon-shooting-speed-5',
  'battery-equipment', 'belt-immunity-equipment', 'braking-force-2', 'distractor', 'efficiency-module-2', 'energy-shield-equipment', 'explosive-rocketry', 'inserter-capacity-bonus-2', 'laser-shooting-speed-1', 'laser-turret', 'laser-weapons-damage-1', 'lubricant', 'night-vision-equipment', 'production-science-pack', 'productivity-module-2', 'refined-flammables-3', 'research-speed-4', 'rocket-fuel', 'speed-module-2', 'tank', 'uranium-processing',
  'braking-force-3', 'coal-liquefaction', 'effect-transmission', 'efficiency-module-3', 'electric-engine', 'inserter-capacity-bonus-3', 'kovarex-enrichment-process', 'laser-shooting-speed-2', 'laser-weapons-damage-2', 'logistics-3', 'nuclear-power', 'productivity-module-3', 'research-speed-5', 'speed-module-3',
  'automation-3', 'braking-force-4', 'exoskeleton-equipment', 'inserter-capacity-bonus-4', 'laser-shooting-speed-3', 'laser-weapons-damage-3', 'nuclear-fuel-reprocessing', 'power-armor', 'robotics',
  'battery-mk2-equipment', 'braking-force-5', 'construction-robotics', 'discharge-defense-equipment', 'energy-shield-mk2-equipment', 'inserter-capacity-bonus-5', 'laser-shooting-speed-4', 'laser-weapons-damage-4', 'logistic-robotics', 'personal-laser-defense-equipment', 'utility-science-pack', 'worker-robots-speed-1', 'worker-robots-storage-1',
  'braking-force-6', 'fission-reactor-equipment', 'inserter-capacity-bonus-6', 'laser-shooting-speed-5', 'laser-weapons-damage-5', 'logistic-system', 'military-4', 'mining-productivity-3', 'personal-roboport-equipment', 'physical-projectile-damage-6', 'refined-flammables-4', 'research-speed-6', 'rocket-silo', 'stronger-explosives-4', 'weapon-shooting-speed-6', 'worker-robots-speed-2', 'worker-robots-storage-2',
  'artillery', 'atomic-bomb', 'braking-force-7', 'destroyer', 'inserter-capacity-bonus-7', 'laser-shooting-speed-6', 'laser-weapons-damage-6', 'personal-roboport-mk2-equipment', 'power-armor-mk2', 'refined-flammables-5', 'space-science-pack', 'spidertron', 'stronger-explosives-5', 'uranium-ammo', 'worker-robots-speed-3', 'worker-robots-storage-3',
  'follower-robot-count-4', 'laser-shooting-speed-7', 'refined-flammables-6', 'stronger-explosives-6', 'worker-robots-speed-4',
  'worker-robots-speed-5', 'ai-powered-infinite-research',
] as const;
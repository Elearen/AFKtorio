export type RecipeMaterialType = 'item' | 'fluid';

export type RecipeMaterial = {
  type: RecipeMaterialType;
  name: string;
  amount?: number;
  amountMin?: number;
  amountMax?: number;
  probability?: number;
  sharedProbability?: { min: number; max: number };
};

export type RecipeScienceChain = 'Core' | 'Non-Core';

export type RecipeCatalogEntry = {
  name: string;
  energyRequired: number;
  enabled: boolean;
  hidden: boolean;
  category: string;
  ingredients: RecipeMaterial[];
  results: RecipeMaterial[];
  fuel?: RecipeMaterial;
  scienceChain: RecipeScienceChain;
};

// Normalized from the attached Factorio recipe definitions.
const recipeCatalogSource: Omit<RecipeCatalogEntry, 'scienceChain'>[] = [
  {
    "name": "speed-module",
    "energyRequired": 15,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "speed-module",
        "amount": 1
      }
    ]
  },
  {
    "name": "speed-module-2",
    "energyRequired": 30,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "speed-module",
        "amount": 4
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "speed-module-2",
        "amount": 1
      }
    ]
  },
  {
    "name": "speed-module-3",
    "energyRequired": 60,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "speed-module-2",
        "amount": 4
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "speed-module-3",
        "amount": 1
      }
    ]
  },
  {
    "name": "productivity-module",
    "energyRequired": 15,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "productivity-module",
        "amount": 1
      }
    ]
  },
  {
    "name": "productivity-module-2",
    "energyRequired": 30,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "productivity-module",
        "amount": 4
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "productivity-module-2",
        "amount": 1
      }
    ]
  },
  {
    "name": "productivity-module-3",
    "energyRequired": 60,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "productivity-module-2",
        "amount": 4
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "productivity-module-3",
        "amount": 1
      }
    ]
  },
  {
    "name": "efficiency-module",
    "energyRequired": 15,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "efficiency-module",
        "amount": 1
      }
    ]
  },
  {
    "name": "efficiency-module-2",
    "energyRequired": 30,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "efficiency-module",
        "amount": 4
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "efficiency-module-2",
        "amount": 1
      }
    ]
  },
  {
    "name": "efficiency-module-3",
    "energyRequired": 60,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "efficiency-module-2",
        "amount": 4
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "efficiency-module-3",
        "amount": 1
      }
    ]
  },
  {
    "name": "bulk-inserter",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 15
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 15
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 1
      },
      {
        "type": "item",
        "name": "fast-inserter",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "bulk-inserter",
        "amount": 1
      }
    ]
  },
  {
    "name": "basic-oil-processing",
    "energyRequired": 5,
    "enabled": false,
    "hidden": false,
    "category": "oil-processing",
    "ingredients": [
      {
        "type": "fluid",
        "name": "crude-oil",
        "amount": 100
      }
    ],
    "results": [
      {
        "type": "fluid",
        "name": "petroleum-gas",
        "amount": 45
      }
    ]
  },
  {
    "name": "advanced-oil-processing",
    "energyRequired": 5,
    "enabled": false,
    "hidden": false,
    "category": "oil-processing",
    "ingredients": [
      {
        "type": "fluid",
        "name": "water",
        "amount": 50
      },
      {
        "type": "fluid",
        "name": "crude-oil",
        "amount": 100
      }
    ],
    "results": [
      {
        "type": "fluid",
        "name": "heavy-oil",
        "amount": 25
      },
      {
        "type": "fluid",
        "name": "light-oil",
        "amount": 45
      },
      {
        "type": "fluid",
        "name": "petroleum-gas",
        "amount": 55
      }
    ]
  },
  {
    "name": "coal-liquefaction",
    "energyRequired": 5,
    "enabled": false,
    "hidden": false,
    "category": "oil-processing",
    "ingredients": [
      {
        "type": "item",
        "name": "coal",
        "amount": 10
      },
      {
        "type": "fluid",
        "name": "heavy-oil",
        "amount": 25
      },
      {
        "type": "fluid",
        "name": "steam",
        "amount": 50
      }
    ],
    "results": [
      {
        "type": "fluid",
        "name": "heavy-oil",
        "amount": 90
      },
      {
        "type": "fluid",
        "name": "light-oil",
        "amount": 20
      },
      {
        "type": "fluid",
        "name": "petroleum-gas",
        "amount": 10
      }
    ]
  },
  {
    "name": "heavy-oil-cracking",
    "energyRequired": 2,
    "enabled": false,
    "hidden": false,
    "category": "chemistry",
    "ingredients": [
      {
        "type": "fluid",
        "name": "water",
        "amount": 30
      },
      {
        "type": "fluid",
        "name": "heavy-oil",
        "amount": 40
      }
    ],
    "results": [
      {
        "type": "fluid",
        "name": "light-oil",
        "amount": 30
      }
    ]
  },
  {
    "name": "light-oil-cracking",
    "energyRequired": 2,
    "enabled": false,
    "hidden": false,
    "category": "chemistry",
    "ingredients": [
      {
        "type": "fluid",
        "name": "water",
        "amount": 30
      },
      {
        "type": "fluid",
        "name": "light-oil",
        "amount": 30
      }
    ],
    "results": [
      {
        "type": "fluid",
        "name": "petroleum-gas",
        "amount": 20
      }
    ]
  },
  {
    "name": "sulfuric-acid",
    "energyRequired": 1,
    "enabled": false,
    "hidden": false,
    "category": "chemistry",
    "ingredients": [
      {
        "type": "item",
        "name": "sulfur",
        "amount": 5
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 1
      },
      {
        "type": "fluid",
        "name": "water",
        "amount": 100
      }
    ],
    "results": [
      {
        "type": "fluid",
        "name": "sulfuric-acid",
        "amount": 50
      }
    ]
  },
  {
    "name": "plastic-bar",
    "energyRequired": 1,
    "enabled": false,
    "hidden": false,
    "category": "chemistry",
    "ingredients": [
      {
        "type": "fluid",
        "name": "petroleum-gas",
        "amount": 20
      },
      {
        "type": "item",
        "name": "coal",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "plastic-bar",
        "amount": 2
      }
    ]
  },
  {
    "name": "solid-fuel-from-light-oil",
    "energyRequired": 1,
    "enabled": false,
    "hidden": false,
    "category": "chemistry",
    "ingredients": [
      {
        "type": "fluid",
        "name": "light-oil",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "solid-fuel",
        "amount": 1
      }
    ]
  },
  {
    "name": "solid-fuel-from-petroleum-gas",
    "energyRequired": 1,
    "enabled": false,
    "hidden": false,
    "category": "chemistry",
    "ingredients": [
      {
        "type": "fluid",
        "name": "petroleum-gas",
        "amount": 20
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "solid-fuel",
        "amount": 1
      }
    ]
  },
  {
    "name": "solid-fuel-from-heavy-oil",
    "energyRequired": 1,
    "enabled": false,
    "hidden": false,
    "category": "chemistry",
    "ingredients": [
      {
        "type": "fluid",
        "name": "heavy-oil",
        "amount": 20
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "solid-fuel",
        "amount": 1
      }
    ]
  },
  {
    "name": "sulfur",
    "energyRequired": 1,
    "enabled": false,
    "hidden": false,
    "category": "chemistry",
    "ingredients": [
      {
        "type": "fluid",
        "name": "water",
        "amount": 30
      },
      {
        "type": "fluid",
        "name": "petroleum-gas",
        "amount": 30
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "sulfur",
        "amount": 2
      }
    ]
  },
  {
    "name": "lubricant",
    "energyRequired": 1,
    "enabled": false,
    "hidden": false,
    "category": "chemistry",
    "ingredients": [
      {
        "type": "fluid",
        "name": "heavy-oil",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "fluid",
        "name": "lubricant",
        "amount": 10
      }
    ]
  },
  {
    "name": "barrel",
    "energyRequired": 1,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "barrel",
        "amount": 1
      }
    ]
  },
  {
    "name": "night-vision-equipment",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "night-vision-equipment",
        "amount": 1
      }
    ]
  },
  {
    "name": "belt-immunity-equipment",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "belt-immunity-equipment",
        "amount": 1
      }
    ]
  },
  {
    "name": "energy-shield-equipment",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "energy-shield-equipment",
        "amount": 1
      }
    ]
  },
  {
    "name": "energy-shield-mk2-equipment",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "energy-shield-equipment",
        "amount": 10
      },
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "low-density-structure",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "energy-shield-mk2-equipment",
        "amount": 1
      }
    ]
  },
  {
    "name": "battery-equipment",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "battery",
        "amount": 5
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "battery-equipment",
        "amount": 1
      }
    ]
  },
  {
    "name": "battery-mk2-equipment",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "battery-equipment",
        "amount": 10
      },
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 15
      },
      {
        "type": "item",
        "name": "low-density-structure",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "battery-mk2-equipment",
        "amount": 1
      }
    ]
  },
  {
    "name": "solar-panel-equipment",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "solar-panel",
        "amount": 1
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 2
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "solar-panel-equipment",
        "amount": 1
      }
    ]
  },
  {
    "name": "fission-reactor-equipment",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 200
      },
      {
        "type": "item",
        "name": "low-density-structure",
        "amount": 50
      },
      {
        "type": "item",
        "name": "uranium-fuel-cell",
        "amount": 4
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "fission-reactor-equipment",
        "amount": 1
      }
    ]
  },
  {
    "name": "personal-laser-defense-equipment",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 20
      },
      {
        "type": "item",
        "name": "low-density-structure",
        "amount": 5
      },
      {
        "type": "item",
        "name": "laser-turret",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "personal-laser-defense-equipment",
        "amount": 1
      }
    ]
  },
  {
    "name": "discharge-defense-equipment",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 20
      },
      {
        "type": "item",
        "name": "laser-turret",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "discharge-defense-equipment",
        "amount": 1
      }
    ]
  },
  {
    "name": "exoskeleton-equipment",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 10
      },
      {
        "type": "item",
        "name": "electric-engine-unit",
        "amount": 30
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 20
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "exoskeleton-equipment",
        "amount": 1
      }
    ]
  },
  {
    "name": "personal-roboport-equipment",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 10
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 40
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 20
      },
      {
        "type": "item",
        "name": "battery",
        "amount": 45
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "personal-roboport-equipment",
        "amount": 1
      }
    ]
  },
  {
    "name": "personal-roboport-mk2-equipment",
    "energyRequired": 20,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "personal-roboport-equipment",
        "amount": 5
      },
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 100
      },
      {
        "type": "item",
        "name": "low-density-structure",
        "amount": 20
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "personal-roboport-mk2-equipment",
        "amount": 1
      }
    ]
  },
  {
    "name": "laser-turret",
    "energyRequired": 20,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 20
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 20
      },
      {
        "type": "item",
        "name": "battery",
        "amount": 12
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "laser-turret",
        "amount": 1
      }
    ]
  },
  {
    "name": "flamethrower-turret",
    "energyRequired": 20,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 30
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 15
      },
      {
        "type": "item",
        "name": "pipe",
        "amount": 10
      },
      {
        "type": "item",
        "name": "engine-unit",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "flamethrower-turret",
        "amount": 1
      }
    ]
  },
  {
    "name": "artillery-turret",
    "energyRequired": 40,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 60
      },
      {
        "type": "item",
        "name": "concrete",
        "amount": 60
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 40
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 20
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "artillery-turret",
        "amount": 1
      }
    ]
  },
  {
    "name": "gun-turret",
    "energyRequired": 8,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 10
      },
      {
        "type": "item",
        "name": "copper-plate",
        "amount": 10
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 20
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "gun-turret",
        "amount": 1
      }
    ]
  },
  {
    "name": "wooden-chest",
    "energyRequired": 0.5,
    "enabled": true,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "wood",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "wooden-chest",
        "amount": 1
      }
    ]
  },
  {
    "name": "display-panel",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 1
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "display-panel",
        "amount": 1
      }
    ]
  },
  {
    "name": "iron-stick",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "iron-stick",
        "amount": 2
      }
    ]
  },
  {
    "name": "stone-furnace",
    "energyRequired": 0.5,
    "enabled": true,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "stone",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "stone-furnace",
        "amount": 1
      }
    ]
  },
  {
    "name": "boiler",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "stone-furnace",
        "amount": 1
      },
      {
        "type": "item",
        "name": "pipe",
        "amount": 4
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "boiler",
        "amount": 1
      }
    ]
  },
  {
    "name": "steam-engine",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 8
      },
      {
        "type": "item",
        "name": "pipe",
        "amount": 5
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "steam-engine",
        "amount": 1
      }
    ]
  },
  {
    "name": "iron-gear-wheel",
    "energyRequired": 0.5,
    "enabled": true,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 1
      }
    ]
  },
  {
    "name": "electronic-circuit",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 1
      },
      {
        "type": "item",
        "name": "copper-cable",
        "amount": 3
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 1
      }
    ]
  },
  {
    "name": "transport-belt",
    "energyRequired": 0.5,
    "enabled": true,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 1
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "transport-belt",
        "amount": 2
      }
    ]
  },
  {
    "name": "electric-mining-drill",
    "energyRequired": 2,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 3
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 5
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "electric-mining-drill",
        "amount": 1
      }
    ]
  },
  {
    "name": "burner-mining-drill",
    "energyRequired": 2,
    "enabled": true,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 3
      },
      {
        "type": "item",
        "name": "stone-furnace",
        "amount": 1
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 3
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "burner-mining-drill",
        "amount": 1
      }
    ]
  },
  {
    "name": "inserter",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 1
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 1
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "inserter",
        "amount": 1
      }
    ]
  },
  {
    "name": "fast-inserter",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 2
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 2
      },
      {
        "type": "item",
        "name": "inserter",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "fast-inserter",
        "amount": 1
      }
    ]
  },
  {
    "name": "long-handed-inserter",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 1
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 1
      },
      {
        "type": "item",
        "name": "inserter",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "long-handed-inserter",
        "amount": 1
      }
    ]
  },
  {
    "name": "burner-inserter",
    "energyRequired": 0.5,
    "enabled": true,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 1
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "burner-inserter",
        "amount": 1
      }
    ]
  },
  {
    "name": "pipe",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "pipe",
        "amount": 1
      }
    ]
  },
  {
    "name": "offshore-pump",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "pipe",
        "amount": 3
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "offshore-pump",
        "amount": 1
      }
    ]
  },
  {
    "name": "copper-cable",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "copper-plate",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "copper-cable",
        "amount": 2
      }
    ]
  },
  {
    "name": "small-electric-pole",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "wood",
        "amount": 1
      },
      {
        "type": "item",
        "name": "copper-cable",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "small-electric-pole",
        "amount": 2
      }
    ]
  },
  {
    "name": "pistol",
    "energyRequired": 5,
    "enabled": false,
    "hidden": true,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "copper-plate",
        "amount": 5
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "pistol",
        "amount": 1
      }
    ]
  },
  {
    "name": "submachine-gun",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 10
      },
      {
        "type": "item",
        "name": "copper-plate",
        "amount": 5
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "submachine-gun",
        "amount": 1
      }
    ]
  },
  {
    "name": "firearm-magazine",
    "energyRequired": 1,
    "enabled": true,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 4
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "firearm-magazine",
        "amount": 1
      }
    ]
  },
  {
    "name": "light-armor",
    "energyRequired": 3,
    "enabled": true,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 40
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "light-armor",
        "amount": 1
      }
    ]
  },
  {
    "name": "radar",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 5
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "radar",
        "amount": 1
      }
    ]
  },
  {
    "name": "small-lamp",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 1
      },
      {
        "type": "item",
        "name": "copper-cable",
        "amount": 3
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "small-lamp",
        "amount": 1
      }
    ]
  },
  {
    "name": "pipe-to-ground",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "pipe",
        "amount": 10
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "pipe-to-ground",
        "amount": 2
      }
    ]
  },
  {
    "name": "assembling-machine-1",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 3
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 5
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 9
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "assembling-machine-1",
        "amount": 1
      }
    ]
  },
  {
    "name": "repair-pack",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 2
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "repair-pack",
        "amount": 1
      }
    ]
  },
  {
    "name": "automation-science-pack",
    "energyRequired": 5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "copper-plate",
        "amount": 1
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "automation-science-pack",
        "amount": 1
      }
    ]
  },
  {
    "name": "logistic-science-pack",
    "energyRequired": 6,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "inserter",
        "amount": 1
      },
      {
        "type": "item",
        "name": "transport-belt",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "logistic-science-pack",
        "amount": 1
      }
    ]
  },
  {
    "name": "lab",
    "energyRequired": 2,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 10
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 10
      },
      {
        "type": "item",
        "name": "transport-belt",
        "amount": 4
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "lab",
        "amount": 1
      }
    ]
  },
  {
    "name": "stone-wall",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "stone-brick",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "stone-wall",
        "amount": 1
      }
    ]
  },
  {
    "name": "assembling-machine-2",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 2
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 3
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 5
      },
      {
        "type": "item",
        "name": "assembling-machine-1",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "assembling-machine-2",
        "amount": 1
      }
    ]
  },
  {
    "name": "splitter",
    "energyRequired": 1,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 5
      },
      {
        "type": "item",
        "name": "transport-belt",
        "amount": 4
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "splitter",
        "amount": 1
      }
    ]
  },
  {
    "name": "underground-belt",
    "energyRequired": 1,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 10
      },
      {
        "type": "item",
        "name": "transport-belt",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "underground-belt",
        "amount": 2
      }
    ]
  },
  {
    "name": "loader",
    "energyRequired": 1,
    "enabled": false,
    "hidden": true,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "inserter",
        "amount": 5
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 5
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 5
      },
      {
        "type": "item",
        "name": "transport-belt",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "loader",
        "amount": 1
      }
    ]
  },
  {
    "name": "car",
    "energyRequired": 2,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "engine-unit",
        "amount": 8
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 20
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "car",
        "amount": 1
      }
    ]
  },
  {
    "name": "engine-unit",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "advanced-crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 1
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 1
      },
      {
        "type": "item",
        "name": "pipe",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "engine-unit",
        "amount": 1
      }
    ]
  },
  {
    "name": "iron-chest",
    "energyRequired": 0.5,
    "enabled": true,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 8
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "iron-chest",
        "amount": 1
      }
    ]
  },
  {
    "name": "big-electric-pole",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-stick",
        "amount": 8
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 5
      },
      {
        "type": "item",
        "name": "copper-cable",
        "amount": 4
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "big-electric-pole",
        "amount": 1
      }
    ]
  },
  {
    "name": "medium-electric-pole",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-stick",
        "amount": 4
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 2
      },
      {
        "type": "item",
        "name": "copper-cable",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "medium-electric-pole",
        "amount": 1
      }
    ]
  },
  {
    "name": "shotgun",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 15
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 5
      },
      {
        "type": "item",
        "name": "copper-plate",
        "amount": 10
      },
      {
        "type": "item",
        "name": "wood",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "shotgun",
        "amount": 1
      }
    ]
  },
  {
    "name": "shotgun-shell",
    "energyRequired": 3,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "copper-plate",
        "amount": 2
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "shotgun-shell",
        "amount": 1
      }
    ]
  },
  {
    "name": "piercing-rounds-magazine",
    "energyRequired": 6,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "firearm-magazine",
        "amount": 2
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 1
      },
      {
        "type": "item",
        "name": "copper-plate",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "piercing-rounds-magazine",
        "amount": 2
      }
    ]
  },
  {
    "name": "grenade",
    "energyRequired": 8,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 5
      },
      {
        "type": "item",
        "name": "coal",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "grenade",
        "amount": 1
      }
    ]
  },
  {
    "name": "steel-furnace",
    "energyRequired": 3,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 6
      },
      {
        "type": "item",
        "name": "stone-brick",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "steel-furnace",
        "amount": 1
      }
    ]
  },
  {
    "name": "gate",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "stone-wall",
        "amount": 1
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 2
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "gate",
        "amount": 1
      }
    ]
  },
  {
    "name": "heavy-armor",
    "energyRequired": 8,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "copper-plate",
        "amount": 100
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 50
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "heavy-armor",
        "amount": 1
      }
    ]
  },
  {
    "name": "steel-chest",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 8
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "steel-chest",
        "amount": 1
      }
    ]
  },
  {
    "name": "fast-underground-belt",
    "energyRequired": 2,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 40
      },
      {
        "type": "item",
        "name": "underground-belt",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "fast-underground-belt",
        "amount": 2
      }
    ]
  },
  {
    "name": "fast-splitter",
    "energyRequired": 2,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "splitter",
        "amount": 1
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 10
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "fast-splitter",
        "amount": 1
      }
    ]
  },
  {
    "name": "concrete",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting-with-fluid",
    "ingredients": [
      {
        "type": "item",
        "name": "stone-brick",
        "amount": 5
      },
      {
        "type": "item",
        "name": "iron-ore",
        "amount": 1
      },
      {
        "type": "fluid",
        "name": "water",
        "amount": 100
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "concrete",
        "amount": 10
      }
    ]
  },
  {
    "name": "hazard-concrete",
    "energyRequired": 0.25,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "concrete",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "hazard-concrete",
        "amount": 10
      }
    ]
  },
  {
    "name": "refined-concrete",
    "energyRequired": 15,
    "enabled": false,
    "hidden": false,
    "category": "crafting-with-fluid",
    "ingredients": [
      {
        "type": "item",
        "name": "concrete",
        "amount": 20
      },
      {
        "type": "item",
        "name": "iron-stick",
        "amount": 8
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 1
      },
      {
        "type": "fluid",
        "name": "water",
        "amount": 100
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "refined-concrete",
        "amount": 10
      }
    ]
  },
  {
    "name": "refined-hazard-concrete",
    "energyRequired": 0.25,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "refined-concrete",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "refined-hazard-concrete",
        "amount": 10
      }
    ]
  },
  {
    "name": "landfill",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "stone",
        "amount": 50
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "landfill",
        "amount": 1
      }
    ]
  },
  {
    "name": "fast-transport-belt",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 5
      },
      {
        "type": "item",
        "name": "transport-belt",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "fast-transport-belt",
        "amount": 1
      }
    ]
  },
  {
    "name": "solar-panel",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 5
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 15
      },
      {
        "type": "item",
        "name": "copper-plate",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "solar-panel",
        "amount": 1
      }
    ]
  },
  {
    "name": "rail",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "stone",
        "amount": 1
      },
      {
        "type": "item",
        "name": "iron-stick",
        "amount": 1
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "rail",
        "amount": 2
      }
    ]
  },
  {
    "name": "locomotive",
    "energyRequired": 4,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "engine-unit",
        "amount": 20
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 10
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 30
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "locomotive",
        "amount": 1
      }
    ]
  },
  {
    "name": "cargo-wagon",
    "energyRequired": 1,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 10
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 20
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 20
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "cargo-wagon",
        "amount": 1
      }
    ]
  },
  {
    "name": "rail-signal",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 1
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "rail-signal",
        "amount": 1
      }
    ]
  },
  {
    "name": "rail-chain-signal",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 1
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "rail-chain-signal",
        "amount": 1
      }
    ]
  },
  {
    "name": "train-stop",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 6
      },
      {
        "type": "item",
        "name": "iron-stick",
        "amount": 6
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 3
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "train-stop",
        "amount": 1
      }
    ]
  },
  {
    "name": "copper-plate",
    "energyRequired": 3.2,
    "enabled": true,
    "hidden": false,
    "category": "smelting",
    "fuel": {
      "type": "item",
      "name": "coal",
      "amount": 0.1
    },
    "ingredients": [
      {
        "type": "item",
        "name": "copper-ore",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "copper-plate",
        "amount": 1
      }
    ]
  },
  {
    "name": "iron-plate",
    "energyRequired": 3.2,
    "enabled": true,
    "hidden": false,
    "category": "smelting",
    "fuel": {
      "type": "item",
      "name": "coal",
      "amount": 0.1
    },
    "ingredients": [
      {
        "type": "item",
        "name": "iron-ore",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 1
      }
    ]
  },
  {
    "name": "stone-brick",
    "energyRequired": 3.2,
    "enabled": true,
    "hidden": false,
    "category": "smelting",
    "fuel": {
      "type": "item",
      "name": "coal",
      "amount": 0.1
    },
    "ingredients": [
      {
        "type": "item",
        "name": "stone",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "stone-brick",
        "amount": 1
      }
    ]
  },
  {
    "name": "steel-plate",
    "energyRequired": 16,
    "enabled": false,
    "hidden": false,
    "category": "smelting",
    "fuel": {
      "type": "item",
      "name": "coal",
      "amount": 0.1
    },
    "ingredients": [
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 1
      }
    ]
  },
  {
    "name": "arithmetic-combinator",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "copper-cable",
        "amount": 5
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "arithmetic-combinator",
        "amount": 1
      }
    ]
  },
  {
    "name": "decider-combinator",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "copper-cable",
        "amount": 5
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "decider-combinator",
        "amount": 1
      }
    ]
  },
  {
    "name": "constant-combinator",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "copper-cable",
        "amount": 5
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "constant-combinator",
        "amount": 1
      }
    ]
  },
  {
    "name": "selector-combinator",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 2
      },
      {
        "type": "item",
        "name": "decider-combinator",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "selector-combinator",
        "amount": 1
      }
    ]
  },
  {
    "name": "power-switch",
    "energyRequired": 2,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 5
      },
      {
        "type": "item",
        "name": "copper-cable",
        "amount": 5
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "power-switch",
        "amount": 1
      }
    ]
  },
  {
    "name": "programmable-speaker",
    "energyRequired": 2,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 3
      },
      {
        "type": "item",
        "name": "iron-stick",
        "amount": 4
      },
      {
        "type": "item",
        "name": "copper-cable",
        "amount": 5
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 4
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "programmable-speaker",
        "amount": 1
      }
    ]
  },
  {
    "name": "poison-capsule",
    "energyRequired": 8,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 3
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 3
      },
      {
        "type": "item",
        "name": "coal",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "poison-capsule",
        "amount": 1
      }
    ]
  },
  {
    "name": "slowdown-capsule",
    "energyRequired": 8,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 2
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 2
      },
      {
        "type": "item",
        "name": "coal",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "slowdown-capsule",
        "amount": 1
      }
    ]
  },
  {
    "name": "cluster-grenade",
    "energyRequired": 8,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "grenade",
        "amount": 7
      },
      {
        "type": "item",
        "name": "explosives",
        "amount": 5
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "cluster-grenade",
        "amount": 1
      }
    ]
  },
  {
    "name": "defender-capsule",
    "energyRequired": 8,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "piercing-rounds-magazine",
        "amount": 3
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 3
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 3
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "defender-capsule",
        "amount": 1
      }
    ]
  },
  {
    "name": "distractor-capsule",
    "energyRequired": 15,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "defender-capsule",
        "amount": 4
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 3
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "distractor-capsule",
        "amount": 1
      }
    ]
  },
  {
    "name": "destroyer-capsule",
    "energyRequired": 15,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "distractor-capsule",
        "amount": 4
      },
      {
        "type": "item",
        "name": "speed-module",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "destroyer-capsule",
        "amount": 1
      }
    ]
  },
  {
    "name": "cliff-explosives",
    "energyRequired": 8,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "explosives",
        "amount": 10
      },
      {
        "type": "item",
        "name": "grenade",
        "amount": 1
      },
      {
        "type": "item",
        "name": "barrel",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "cliff-explosives",
        "amount": 1
      }
    ]
  },
  {
    "name": "uranium-rounds-magazine",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "piercing-rounds-magazine",
        "amount": 1
      },
      {
        "type": "item",
        "name": "uranium-238",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "uranium-rounds-magazine",
        "amount": 1
      }
    ]
  },
  {
    "name": "rocket",
    "energyRequired": 4,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "explosives",
        "amount": 1
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "rocket",
        "amount": 1
      }
    ]
  },
  {
    "name": "explosive-rocket",
    "energyRequired": 8,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "rocket",
        "amount": 1
      },
      {
        "type": "item",
        "name": "explosives",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "explosive-rocket",
        "amount": 1
      }
    ]
  },
  {
    "name": "atomic-bomb",
    "energyRequired": 50,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 10
      },
      {
        "type": "item",
        "name": "explosives",
        "amount": 10
      },
      {
        "type": "item",
        "name": "uranium-235",
        "amount": 30
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "atomic-bomb",
        "amount": 1
      }
    ]
  },
  {
    "name": "piercing-shotgun-shell",
    "energyRequired": 8,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "shotgun-shell",
        "amount": 2
      },
      {
        "type": "item",
        "name": "copper-plate",
        "amount": 2
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "piercing-shotgun-shell",
        "amount": 2
      }
    ]
  },
  {
    "name": "cannon-shell",
    "energyRequired": 8,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 2
      },
      {
        "type": "item",
        "name": "plastic-bar",
        "amount": 2
      },
      {
        "type": "item",
        "name": "explosives",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "cannon-shell",
        "amount": 1
      }
    ]
  },
  {
    "name": "explosive-cannon-shell",
    "energyRequired": 8,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 2
      },
      {
        "type": "item",
        "name": "plastic-bar",
        "amount": 2
      },
      {
        "type": "item",
        "name": "explosives",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "explosive-cannon-shell",
        "amount": 1
      }
    ]
  },
  {
    "name": "uranium-cannon-shell",
    "energyRequired": 12,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "cannon-shell",
        "amount": 1
      },
      {
        "type": "item",
        "name": "uranium-238",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "uranium-cannon-shell",
        "amount": 1
      }
    ]
  },
  {
    "name": "explosive-uranium-cannon-shell",
    "energyRequired": 12,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "explosive-cannon-shell",
        "amount": 1
      },
      {
        "type": "item",
        "name": "uranium-238",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "explosive-uranium-cannon-shell",
        "amount": 1
      }
    ]
  },
  {
    "name": "artillery-shell",
    "energyRequired": 15,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "explosive-cannon-shell",
        "amount": 4
      },
      {
        "type": "item",
        "name": "radar",
        "amount": 1
      },
      {
        "type": "item",
        "name": "explosives",
        "amount": 8
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "artillery-shell",
        "amount": 1
      }
    ]
  },
  {
    "name": "flamethrower-ammo",
    "energyRequired": 6,
    "enabled": false,
    "hidden": false,
    "category": "chemistry",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 5
      },
      {
        "type": "fluid",
        "name": "crude-oil",
        "amount": 100
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "flamethrower-ammo",
        "amount": 1
      }
    ]
  },
  {
    "name": "express-transport-belt",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting-with-fluid",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 10
      },
      {
        "type": "item",
        "name": "fast-transport-belt",
        "amount": 1
      },
      {
        "type": "fluid",
        "name": "lubricant",
        "amount": 20
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "express-transport-belt",
        "amount": 1
      }
    ]
  },
  {
    "name": "assembling-machine-3",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "speed-module",
        "amount": 4
      },
      {
        "type": "item",
        "name": "assembling-machine-2",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "assembling-machine-3",
        "amount": 1
      }
    ]
  },
  {
    "name": "tank",
    "energyRequired": 5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "engine-unit",
        "amount": 32
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 50
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 15
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "tank",
        "amount": 1
      }
    ]
  },
  {
    "name": "spidertron",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "exoskeleton-equipment",
        "amount": 4
      },
      {
        "type": "item",
        "name": "fission-reactor-equipment",
        "amount": 2
      },
      {
        "type": "item",
        "name": "rocket-launcher",
        "amount": 4
      },
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 16
      },
      {
        "type": "item",
        "name": "low-density-structure",
        "amount": 150
      },
      {
        "type": "item",
        "name": "radar",
        "amount": 2
      },
      {
        "type": "item",
        "name": "efficiency-module-3",
        "amount": 2
      },
      {
        "type": "item",
        "name": "raw-fish",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "spidertron",
        "amount": 1
      }
    ]
  },
  {
    "name": "fluid-wagon",
    "energyRequired": 1.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 10
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 16
      },
      {
        "type": "item",
        "name": "pipe",
        "amount": 8
      },
      {
        "type": "item",
        "name": "storage-tank",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "fluid-wagon",
        "amount": 1
      }
    ]
  },
  {
    "name": "artillery-wagon",
    "energyRequired": 4,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "engine-unit",
        "amount": 64
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 10
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 40
      },
      {
        "type": "item",
        "name": "pipe",
        "amount": 16
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 20
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "artillery-wagon",
        "amount": 1
      }
    ]
  },
  {
    "name": "modular-armor",
    "energyRequired": 15,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 30
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 50
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "modular-armor",
        "amount": 1
      }
    ]
  },
  {
    "name": "power-armor",
    "energyRequired": 20,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 40
      },
      {
        "type": "item",
        "name": "electric-engine-unit",
        "amount": 20
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 40
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "power-armor",
        "amount": 1
      }
    ]
  },
  {
    "name": "power-armor-mk2",
    "energyRequired": 25,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "efficiency-module-2",
        "amount": 25
      },
      {
        "type": "item",
        "name": "speed-module-2",
        "amount": 25
      },
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 60
      },
      {
        "type": "item",
        "name": "electric-engine-unit",
        "amount": 40
      },
      {
        "type": "item",
        "name": "low-density-structure",
        "amount": 30
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "power-armor-mk2",
        "amount": 1
      }
    ]
  },
  {
    "name": "flamethrower",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 5
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "flamethrower",
        "amount": 1
      }
    ]
  },
  {
    "name": "land-mine",
    "energyRequired": 5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 1
      },
      {
        "type": "item",
        "name": "explosives",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "land-mine",
        "amount": 4
      }
    ]
  },
  {
    "name": "rocket-launcher",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 5
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 5
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "rocket-launcher",
        "amount": 1
      }
    ]
  },
  {
    "name": "combat-shotgun",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 15
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 5
      },
      {
        "type": "item",
        "name": "copper-plate",
        "amount": 10
      },
      {
        "type": "item",
        "name": "wood",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "combat-shotgun",
        "amount": 1
      }
    ]
  },
  {
    "name": "chemical-science-pack",
    "energyRequired": 24,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "engine-unit",
        "amount": 2
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 3
      },
      {
        "type": "item",
        "name": "sulfur",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "chemical-science-pack",
        "amount": 2
      }
    ]
  },
  {
    "name": "military-science-pack",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "piercing-rounds-magazine",
        "amount": 1
      },
      {
        "type": "item",
        "name": "grenade",
        "amount": 1
      },
      {
        "type": "item",
        "name": "stone-wall",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "military-science-pack",
        "amount": 2
      }
    ]
  },
  {
    "name": "production-science-pack",
    "energyRequired": 21,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "electric-furnace",
        "amount": 1
      },
      {
        "type": "item",
        "name": "productivity-module",
        "amount": 1
      },
      {
        "type": "item",
        "name": "rail",
        "amount": 30
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "production-science-pack",
        "amount": 3
      }
    ]
  },
  {
    "name": "utility-science-pack",
    "energyRequired": 21,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "low-density-structure",
        "amount": 3
      },
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 2
      },
      {
        "type": "item",
        "name": "flying-robot-frame",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "utility-science-pack",
        "amount": 3
      }
    ]
  },
  {
    "name": "express-underground-belt",
    "energyRequired": 2,
    "enabled": false,
    "hidden": false,
    "category": "crafting-with-fluid",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 80
      },
      {
        "type": "item",
        "name": "fast-underground-belt",
        "amount": 2
      },
      {
        "type": "fluid",
        "name": "lubricant",
        "amount": 40
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "express-underground-belt",
        "amount": 2
      }
    ]
  },
  {
    "name": "fast-loader",
    "energyRequired": 3,
    "enabled": false,
    "hidden": true,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "fast-transport-belt",
        "amount": 5
      },
      {
        "type": "item",
        "name": "loader",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "fast-loader",
        "amount": 1
      }
    ]
  },
  {
    "name": "express-loader",
    "energyRequired": 10,
    "enabled": false,
    "hidden": true,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "express-transport-belt",
        "amount": 5
      },
      {
        "type": "item",
        "name": "fast-loader",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "express-loader",
        "amount": 1
      }
    ]
  },
  {
    "name": "express-splitter",
    "energyRequired": 2,
    "enabled": false,
    "hidden": false,
    "category": "crafting-with-fluid",
    "ingredients": [
      {
        "type": "item",
        "name": "fast-splitter",
        "amount": 1
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 10
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 10
      },
      {
        "type": "fluid",
        "name": "lubricant",
        "amount": 80
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "express-splitter",
        "amount": 1
      }
    ]
  },
  {
    "name": "advanced-circuit",
    "energyRequired": 6,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 2
      },
      {
        "type": "item",
        "name": "plastic-bar",
        "amount": 2
      },
      {
        "type": "item",
        "name": "copper-cable",
        "amount": 4
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 1
      }
    ]
  },
  {
    "name": "processing-unit",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting-with-fluid",
    "ingredients": [
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 20
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 2
      },
      {
        "type": "fluid",
        "name": "sulfuric-acid",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 1
      }
    ]
  },
  {
    "name": "logistic-robot",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "flying-robot-frame",
        "amount": 1
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "logistic-robot",
        "amount": 1
      }
    ]
  },
  {
    "name": "construction-robot",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "flying-robot-frame",
        "amount": 1
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "construction-robot",
        "amount": 1
      }
    ]
  },
  {
    "name": "passive-provider-chest",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-chest",
        "amount": 1
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 3
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "passive-provider-chest",
        "amount": 1
      }
    ]
  },
  {
    "name": "active-provider-chest",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-chest",
        "amount": 1
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 3
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "active-provider-chest",
        "amount": 1
      }
    ]
  },
  {
    "name": "storage-chest",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-chest",
        "amount": 1
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 3
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "storage-chest",
        "amount": 1
      }
    ]
  },
  {
    "name": "buffer-chest",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-chest",
        "amount": 1
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 3
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "buffer-chest",
        "amount": 1
      }
    ]
  },
  {
    "name": "requester-chest",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-chest",
        "amount": 1
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 3
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "requester-chest",
        "amount": 1
      }
    ]
  },
  {
    "name": "rocket-silo",
    "energyRequired": 30,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 1000
      },
      {
        "type": "item",
        "name": "concrete",
        "amount": 1000
      },
      {
        "type": "item",
        "name": "pipe",
        "amount": 100
      },
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 200
      },
      {
        "type": "item",
        "name": "electric-engine-unit",
        "amount": 200
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "rocket-silo",
        "amount": 1
      }
    ]
  },
  {
    "name": "cargo-landing-pad",
    "energyRequired": 30,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "concrete",
        "amount": 200
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 25
      },
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "cargo-landing-pad",
        "amount": 1
      }
    ]
  },
  {
    "name": "roboport",
    "energyRequired": 5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 45
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 45
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 45
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "roboport",
        "amount": 1
      }
    ]
  },
  {
    "name": "substation",
    "energyRequired": 0.5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 10
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "copper-cable",
        "amount": 6
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "substation",
        "amount": 1
      }
    ]
  },
  {
    "name": "accumulator",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 2
      },
      {
        "type": "item",
        "name": "battery",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "accumulator",
        "amount": 1
      }
    ]
  },
  {
    "name": "electric-furnace",
    "energyRequired": 5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 10
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "stone-brick",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "electric-furnace",
        "amount": 1
      }
    ]
  },
  {
    "name": "beacon",
    "energyRequired": 15,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 20
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 20
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 10
      },
      {
        "type": "item",
        "name": "copper-cable",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "beacon",
        "amount": 1
      }
    ]
  },
  {
    "name": "pumpjack",
    "energyRequired": 5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 5
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 10
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "pipe",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "pumpjack",
        "amount": 1
      }
    ]
  },
  {
    "name": "oil-refinery",
    "energyRequired": 8,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 15
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 10
      },
      {
        "type": "item",
        "name": "stone-brick",
        "amount": 10
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 10
      },
      {
        "type": "item",
        "name": "pipe",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "oil-refinery",
        "amount": 1
      }
    ]
  },
  {
    "name": "electric-engine-unit",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting-with-fluid",
    "ingredients": [
      {
        "type": "item",
        "name": "engine-unit",
        "amount": 1
      },
      {
        "type": "fluid",
        "name": "lubricant",
        "amount": 15
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 2
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "electric-engine-unit",
        "amount": 1
      }
    ]
  },
  {
    "name": "flying-robot-frame",
    "energyRequired": 20,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "electric-engine-unit",
        "amount": 1
      },
      {
        "type": "item",
        "name": "battery",
        "amount": 2
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 1
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 3
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "flying-robot-frame",
        "amount": 1
      }
    ]
  },
  {
    "name": "explosives",
    "energyRequired": 4,
    "enabled": false,
    "hidden": false,
    "category": "chemistry",
    "ingredients": [
      {
        "type": "item",
        "name": "sulfur",
        "amount": 1
      },
      {
        "type": "item",
        "name": "coal",
        "amount": 1
      },
      {
        "type": "fluid",
        "name": "water",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "explosives",
        "amount": 2
      }
    ]
  },
  {
    "name": "battery",
    "energyRequired": 4,
    "enabled": false,
    "hidden": false,
    "category": "chemistry",
    "ingredients": [
      {
        "type": "fluid",
        "name": "sulfuric-acid",
        "amount": 20
      },
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 1
      },
      {
        "type": "item",
        "name": "copper-plate",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "battery",
        "amount": 1
      }
    ]
  },
  {
    "name": "storage-tank",
    "energyRequired": 3,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 20
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "storage-tank",
        "amount": 1
      }
    ]
  },
  {
    "name": "pump",
    "energyRequired": 2,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "engine-unit",
        "amount": 1
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 1
      },
      {
        "type": "item",
        "name": "pipe",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "pump",
        "amount": 1
      }
    ]
  },
  {
    "name": "chemical-plant",
    "energyRequired": 5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 5
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 5
      },
      {
        "type": "item",
        "name": "electronic-circuit",
        "amount": 5
      },
      {
        "type": "item",
        "name": "pipe",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "chemical-plant",
        "amount": 1
      }
    ]
  },
  {
    "name": "low-density-structure",
    "energyRequired": 15,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 2
      },
      {
        "type": "item",
        "name": "copper-plate",
        "amount": 20
      },
      {
        "type": "item",
        "name": "plastic-bar",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "low-density-structure",
        "amount": 1
      }
    ]
  },
  {
    "name": "rocket-fuel",
    "energyRequired": 15,
    "enabled": false,
    "hidden": false,
    "category": "crafting-with-fluid",
    "ingredients": [
      {
        "type": "item",
        "name": "solid-fuel",
        "amount": 10
      },
      {
        "type": "fluid",
        "name": "light-oil",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "rocket-fuel",
        "amount": 1
      }
    ]
  },
  {
    "name": "rocket-part",
    "energyRequired": 3,
    "enabled": false,
    "hidden": false,
    "category": "rocket-building",
    "ingredients": [
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 10
      },
      {
        "type": "item",
        "name": "low-density-structure",
        "amount": 10
      },
      {
        "type": "item",
        "name": "rocket-fuel",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "rocket-part",
        "amount": 1
      }
    ]
  },
  {
    "name": "satellite",
    "energyRequired": 5,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "low-density-structure",
        "amount": 100
      },
      {
        "type": "item",
        "name": "solar-panel",
        "amount": 100
      },
      {
        "type": "item",
        "name": "accumulator",
        "amount": 100
      },
      {
        "type": "item",
        "name": "radar",
        "amount": 5
      },
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 100
      },
      {
        "type": "item",
        "name": "rocket-fuel",
        "amount": 50
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "satellite",
        "amount": 1
      }
    ]
  },
  {
    "name": "space-science-pack",
    "energyRequired": 300,
    "enabled": false,
    "hidden": false,
    "category": "rocket-building",
    "ingredients": [
      {
        "type": "item",
        "name": "processing-unit",
        "amount": 100
      },
      {
        "type": "item",
        "name": "low-density-structure",
        "amount": 100
      },
      {
        "type": "item",
        "name": "rocket-fuel",
        "amount": 100
      },
      {
        "type": "item",
        "name": "satellite",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "space-science-pack",
        "amount": 1000
      }
    ]
  },
  {
    "name": "nuclear-reactor",
    "energyRequired": 8,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "concrete",
        "amount": 500
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 500
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 500
      },
      {
        "type": "item",
        "name": "copper-plate",
        "amount": 500
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "nuclear-reactor",
        "amount": 1
      }
    ]
  },
  {
    "name": "centrifuge",
    "energyRequired": 4,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "concrete",
        "amount": 100
      },
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 50
      },
      {
        "type": "item",
        "name": "advanced-circuit",
        "amount": 100
      },
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 100
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "centrifuge",
        "amount": 1
      }
    ]
  },
  {
    "name": "uranium-processing",
    "energyRequired": 12,
    "enabled": false,
    "hidden": false,
    "category": "centrifuging",
    "ingredients": [
      {
        "type": "item",
        "name": "uranium-ore",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "uranium-235",
        "amount": 1,
        "sharedProbability": {
          "min": 0,
          "max": 0.007
        }
      },
      {
        "type": "item",
        "name": "uranium-238",
        "amount": 1,
        "sharedProbability": {
          "min": 0.007,
          "max": 1
        }
      }
    ]
  },
  {
    "name": "kovarex-enrichment-process",
    "energyRequired": 60,
    "enabled": false,
    "hidden": false,
    "category": "centrifuging",
    "ingredients": [
      {
        "type": "item",
        "name": "uranium-235",
        "amount": 1
      },
      {
        "type": "item",
        "name": "uranium-238",
        "amount": 3
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "uranium-235",
        "amount": 2
      }
    ]
  },
  {
    "name": "nuclear-fuel",
    "energyRequired": 90,
    "enabled": false,
    "hidden": false,
    "category": "centrifuging",
    "ingredients": [
      {
        "type": "item",
        "name": "uranium-235",
        "amount": 1
      },
      {
        "type": "item",
        "name": "rocket-fuel",
        "amount": 1
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "nuclear-fuel",
        "amount": 1
      }
    ]
  },
  {
    "name": "nuclear-fuel-reprocessing",
    "energyRequired": 60,
    "enabled": false,
    "hidden": false,
    "category": "centrifuging",
    "ingredients": [
      {
        "type": "item",
        "name": "depleted-uranium-fuel-cell",
        "amount": 5
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "uranium-238",
        "amount": 3
      }
    ]
  },
  {
    "name": "uranium-fuel-cell",
    "energyRequired": 10,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-plate",
        "amount": 10
      },
      {
        "type": "item",
        "name": "uranium-235",
        "amount": 1
      },
      {
        "type": "item",
        "name": "uranium-238",
        "amount": 19
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "uranium-fuel-cell",
        "amount": 10
      }
    ]
  },
  {
    "name": "heat-exchanger",
    "energyRequired": 3,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 10
      },
      {
        "type": "item",
        "name": "copper-plate",
        "amount": 100
      },
      {
        "type": "item",
        "name": "pipe",
        "amount": 10
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "heat-exchanger",
        "amount": 1
      }
    ]
  },
  {
    "name": "heat-pipe",
    "energyRequired": 1,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "steel-plate",
        "amount": 10
      },
      {
        "type": "item",
        "name": "copper-plate",
        "amount": 20
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "heat-pipe",
        "amount": 1
      }
    ]
  },
  {
    "name": "steam-turbine",
    "energyRequired": 3,
    "enabled": false,
    "hidden": false,
    "category": "crafting",
    "ingredients": [
      {
        "type": "item",
        "name": "iron-gear-wheel",
        "amount": 50
      },
      {
        "type": "item",
        "name": "copper-plate",
        "amount": 50
      },
      {
        "type": "item",
        "name": "pipe",
        "amount": 20
      }
    ],
    "results": [
      {
        "type": "item",
        "name": "steam-turbine",
        "amount": 1
      }
    ]
  }
];

// A recipe is Core when it produces a science pack or an ingredient required
// by one, recursively walking the recipe graph backward from all seven packs.
// These three supporting recipes are intentionally deferred until the player
// unlocks Space Science, even though they are ingredients in the satellite
// recipe.
const coreScienceRecipeNames = new Set([
  'speed-module', 'productivity-module', 'basic-oil-processing', 'advanced-oil-processing',
  'heavy-oil-cracking', 'light-oil-cracking', 'sulfuric-acid', 'plastic-bar', 'sulfur',
  'lubricant', 'iron-stick', 'iron-gear-wheel', 'electronic-circuit', 'transport-belt',
  'inserter', 'pipe', 'copper-cable', 'firearm-magazine', 'automation-science-pack',
  'logistic-science-pack', 'stone-wall', 'engine-unit', 'piercing-rounds-magazine', 'grenade',
  'rail', 'copper-plate', 'iron-plate', 'stone-brick', 'steel-plate', 'chemical-science-pack',
  'military-science-pack', 'production-science-pack', 'utility-science-pack', 'advanced-circuit',
  'processing-unit', 'electric-furnace', 'electric-engine-unit', 'flying-robot-frame',
  'battery', 'low-density-structure', 'satellite',
  'concrete',
  'rocket-fuel', 'solid-fuel-from-light-oil', 'solid-fuel-from-petroleum-gas', 'solid-fuel-from-heavy-oil',
  'space-science-pack',
]);
const spaceScienceDeferredRecipeNames = new Set(['radar', 'solar-panel', 'accumulator']);

// The normalized source can contain repeated prototype names from separate
// data sections. Keep the final definition once so simulation and rate
// calculations cannot execute the same recipe more than once.
const canonicalRecipeSource = Array.from(new Map(recipeCatalogSource.map((recipe) => [recipe.name, recipe])).values());

export const recipeCatalog: RecipeCatalogEntry[] = canonicalRecipeSource.map((recipe) => ({
  ...recipe,
  scienceChain: coreScienceRecipeNames.has(recipe.name) ? 'Core' : 'Non-Core',
}));

export const recipeScienceChainFor = (recipe: RecipeCatalogEntry, spaceScienceUnlocked: boolean): RecipeScienceChain =>
  spaceScienceUnlocked && spaceScienceDeferredRecipeNames.has(recipe.name) ? 'Core' : recipe.scienceChain;

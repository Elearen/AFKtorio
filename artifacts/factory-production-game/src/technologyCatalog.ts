export type TechnologyEffect = { type: string; recipe?: string; modifier?: number | boolean; ammoCategory?: string; target?: string; hidden?: boolean; description?: string };

export type TechnologyScienceCost = { pack: string; amount: number };

export type TechnologyResearchTrigger = { type: string; item?: string; count?: number };

export type TechnologyDefinition = {
  name: string;
  prerequisites: string[];
  scienceCosts: TechnologyScienceCost[];
  count?: number;
  countFormula?: string;
  time?: number;
  researchTrigger?: TechnologyResearchTrigger;
  effects: TechnologyEffect[];
  iconPath?: string;
  upgrade?: boolean;
  essential?: boolean;
  maxLevel?: string;
  order?: string;
};

// Normalized from wube/factorio-data/base/prototypes/technology.lua.
// The source helper create_follower_upgrade is expanded into four concrete technologies.
const rawTechnologyCatalog: TechnologyDefinition[] = [
  {
    "name": "steam-power",
    "prerequisites": [],
    "scienceCosts": [],
    "researchTrigger": {
      "type": "craft-item",
      "item": "iron-plate",
      "count": 50
    },
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "pipe"
      },
      {
        "type": "unlock-recipe",
        "recipe": "pipe-to-ground"
      },
      {
        "type": "unlock-recipe",
        "recipe": "offshore-pump"
      },
      {
        "type": "unlock-recipe",
        "recipe": "boiler"
      },
      {
        "type": "unlock-recipe",
        "recipe": "steam-engine"
      }
    ],
    "iconPath": "__base__/graphics/technology/steam-power.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "electronics",
    "prerequisites": [],
    "scienceCosts": [],
    "researchTrigger": {
      "type": "craft-item",
      "item": "copper-plate",
      "count": 10
    },
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "copper-cable"
      },
      {
        "type": "unlock-recipe",
        "recipe": "electronic-circuit"
      },
      {
        "type": "unlock-recipe",
        "recipe": "lab"
      },
      {
        "type": "unlock-recipe",
        "recipe": "inserter"
      },
      {
        "type": "unlock-recipe",
        "recipe": "small-electric-pole"
      }
    ],
    "iconPath": "__base__/graphics/technology/electronics.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "automation-science-pack",
    "prerequisites": [
      "steam-power",
      "electronics"
    ],
    "scienceCosts": [],
    "researchTrigger": {
      "type": "craft-item",
      "item": "lab"
    },
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "automation-science-pack"
      }
    ],
    "iconPath": "__base__/graphics/technology/automation-science-pack.png",
    "upgrade": false,
    "essential": true
  },
  {
    "name": "electric-mining-drill",
    "prerequisites": [
      "automation-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      }
    ],
    "count": 25,
    "time": 10,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "electric-mining-drill"
      }
    ],
    "iconPath": "__base__/graphics/technology/electric-mining-drill.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "repair-pack",
    "prerequisites": [
      "automation-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      }
    ],
    "count": 25,
    "time": 10,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "repair-pack"
      }
    ],
    "iconPath": "__base__/graphics/technology/repair-pack.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "radar",
    "prerequisites": [
      "automation-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      }
    ],
    "count": 20,
    "time": 10,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "radar"
      }
    ],
    "iconPath": "__base__/graphics/technology/radar.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "physical-projectile-damage-1",
    "prerequisites": [
      "military"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.1,
        "ammoCategory": "bullet"
      },
      {
        "type": "turret-attack",
        "modifier": 0.1,
        "target": "gun-turret"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.1,
        "ammoCategory": "shotgun-shell"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "physical-projectile-damage-2",
    "prerequisites": [
      "physical-projectile-damage-1",
      "logistic-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.1,
        "ammoCategory": "bullet"
      },
      {
        "type": "turret-attack",
        "modifier": 0.1,
        "target": "gun-turret"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.1,
        "ammoCategory": "shotgun-shell"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "weapon-shooting-speed-1",
    "prerequisites": [
      "military"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "gun-speed",
        "modifier": 0.1,
        "ammoCategory": "bullet"
      },
      {
        "type": "gun-speed",
        "modifier": 0.1,
        "ammoCategory": "shotgun-shell"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "weapon-shooting-speed-2",
    "prerequisites": [
      "weapon-shooting-speed-1",
      "logistic-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "gun-speed",
        "modifier": 0.2,
        "ammoCategory": "bullet"
      },
      {
        "type": "gun-speed",
        "modifier": 0.2,
        "ammoCategory": "shotgun-shell"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "stronger-explosives-1",
    "prerequisites": [
      "military-2"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.25,
        "ammoCategory": "grenade"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "physical-projectile-damage-3",
    "prerequisites": [
      "physical-projectile-damage-2",
      "military-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 60,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "bullet"
      },
      {
        "type": "turret-attack",
        "modifier": 0.2,
        "target": "gun-turret"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "shotgun-shell"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "physical-projectile-damage-4",
    "prerequisites": [
      "physical-projectile-damage-3"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 60,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "bullet"
      },
      {
        "type": "turret-attack",
        "modifier": 0.2,
        "target": "gun-turret"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "shotgun-shell"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "physical-projectile-damage-5",
    "prerequisites": [
      "physical-projectile-damage-4",
      "chemical-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 60,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "bullet"
      },
      {
        "type": "turret-attack",
        "modifier": 0.2,
        "target": "gun-turret"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "shotgun-shell"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.9,
        "ammoCategory": "cannon-shell"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "physical-projectile-damage-6",
    "prerequisites": [
      "physical-projectile-damage-5",
      "utility-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 60,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.4,
        "ammoCategory": "bullet"
      },
      {
        "type": "turret-attack",
        "modifier": 0.4,
        "target": "gun-turret"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.4,
        "ammoCategory": "shotgun-shell"
      },
      {
        "type": "ammo-damage",
        "modifier": 1.3,
        "ammoCategory": "cannon-shell"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "physical-projectile-damage-7",
    "prerequisites": [
      "physical-projectile-damage-6",
      "space-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      },
      {
        "pack": "space-science-pack",
        "amount": 1
      }
    ],
    "countFormula": "2^(L-7)*1000",
    "time": 60,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.4,
        "ammoCategory": "bullet"
      },
      {
        "type": "turret-attack",
        "modifier": 0.7,
        "target": "gun-turret"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.4,
        "ammoCategory": "shotgun-shell"
      },
      {
        "type": "ammo-damage",
        "modifier": 1,
        "ammoCategory": "cannon-shell"
      }
    ],
    "upgrade": true,
    "essential": false,
    "maxLevel": "infinite"
  },
  {
    "name": "stronger-explosives-2",
    "prerequisites": [
      "stronger-explosives-1",
      "military-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "grenade"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "landmine"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "stronger-explosives-3",
    "prerequisites": [
      "stronger-explosives-2",
      "chemical-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 60,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.3,
        "ammoCategory": "rocket"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "grenade"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "landmine"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "stronger-explosives-4",
    "prerequisites": [
      "stronger-explosives-3",
      "utility-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 60,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.4,
        "ammoCategory": "rocket"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "grenade"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "landmine"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "stronger-explosives-5",
    "prerequisites": [
      "stronger-explosives-4"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 60,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.5,
        "ammoCategory": "rocket"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "grenade"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "landmine"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "stronger-explosives-6",
    "prerequisites": [
      "stronger-explosives-5"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 60,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.6,
        "ammoCategory": "rocket"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "grenade"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "landmine"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "stronger-explosives-7",
    "prerequisites": [
      "stronger-explosives-6",
      "space-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      },
      {
        "pack": "space-science-pack",
        "amount": 1
      }
    ],
    "countFormula": "2^(L-7)*1000",
    "time": 60,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.5,
        "ammoCategory": "rocket"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "grenade"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "landmine"
      }
    ],
    "upgrade": true,
    "essential": false,
    "maxLevel": "infinite"
  },
  {
    "name": "refined-flammables-1",
    "prerequisites": [
      "flamethrower"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "flamethrower"
      },
      {
        "type": "turret-attack",
        "modifier": 0.2,
        "target": "flamethrower-turret"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "refined-flammables-2",
    "prerequisites": [
      "refined-flammables-1"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "flamethrower"
      },
      {
        "type": "turret-attack",
        "modifier": 0.2,
        "target": "flamethrower-turret"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "refined-flammables-3",
    "prerequisites": [
      "refined-flammables-2",
      "chemical-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 60,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "flamethrower"
      },
      {
        "type": "turret-attack",
        "modifier": 0.2,
        "target": "flamethrower-turret"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "refined-flammables-4",
    "prerequisites": [
      "refined-flammables-3",
      "utility-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 60,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.3,
        "ammoCategory": "flamethrower"
      },
      {
        "type": "turret-attack",
        "modifier": 0.3,
        "target": "flamethrower-turret"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "refined-flammables-5",
    "prerequisites": [
      "refined-flammables-4"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 60,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.3,
        "ammoCategory": "flamethrower"
      },
      {
        "type": "turret-attack",
        "modifier": 0.3,
        "target": "flamethrower-turret"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "refined-flammables-6",
    "prerequisites": [
      "refined-flammables-5"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 60,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.4,
        "ammoCategory": "flamethrower"
      },
      {
        "type": "turret-attack",
        "modifier": 0.4,
        "target": "flamethrower-turret"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "refined-flammables-7",
    "prerequisites": [
      "refined-flammables-6",
      "space-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      },
      {
        "pack": "space-science-pack",
        "amount": 1
      }
    ],
    "countFormula": "2^(L-7)*1000",
    "time": 60,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "flamethrower"
      },
      {
        "type": "turret-attack",
        "modifier": 0.2,
        "target": "flamethrower-turret"
      }
    ],
    "upgrade": true,
    "essential": false,
    "maxLevel": "infinite"
  },
  {
    "name": "laser-weapons-damage-1",
    "prerequisites": [
      "laser",
      "military-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "laser"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "laser-weapons-damage-2",
    "prerequisites": [
      "laser-weapons-damage-1"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.2,
        "ammoCategory": "laser"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "laser-weapons-damage-3",
    "prerequisites": [
      "laser-weapons-damage-2"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 60,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.3,
        "ammoCategory": "laser"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "laser-weapons-damage-4",
    "prerequisites": [
      "laser-weapons-damage-3"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 60,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.4,
        "ammoCategory": "laser"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "laser-weapons-damage-5",
    "prerequisites": [
      "laser-weapons-damage-4",
      "utility-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 60,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.5,
        "ammoCategory": "laser"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.4,
        "ammoCategory": "beam"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "laser-weapons-damage-6",
    "prerequisites": [
      "laser-weapons-damage-5"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 60,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.7,
        "ammoCategory": "laser"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.7,
        "ammoCategory": "electric"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.6,
        "ammoCategory": "beam"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "laser-weapons-damage-7",
    "prerequisites": [
      "laser-weapons-damage-6",
      "space-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      },
      {
        "pack": "space-science-pack",
        "amount": 1
      }
    ],
    "countFormula": "2^(L-7)*1000",
    "time": 60,
    "effects": [
      {
        "type": "ammo-damage",
        "modifier": 0.7,
        "ammoCategory": "laser"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.7,
        "ammoCategory": "electric"
      },
      {
        "type": "ammo-damage",
        "modifier": 0.3,
        "ammoCategory": "beam"
      }
    ],
    "upgrade": true,
    "essential": false,
    "maxLevel": "infinite"
  },
  {
    "name": "weapon-shooting-speed-3",
    "prerequisites": [
      "weapon-shooting-speed-2",
      "military-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 60,
    "effects": [
      {
        "type": "gun-speed",
        "modifier": 0.2,
        "ammoCategory": "bullet"
      },
      {
        "type": "gun-speed",
        "modifier": 0.2,
        "ammoCategory": "shotgun-shell"
      },
      {
        "type": "gun-speed",
        "modifier": 0.5,
        "ammoCategory": "rocket"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "weapon-shooting-speed-4",
    "prerequisites": [
      "weapon-shooting-speed-3"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 60,
    "effects": [
      {
        "type": "gun-speed",
        "modifier": 0.3,
        "ammoCategory": "bullet"
      },
      {
        "type": "gun-speed",
        "modifier": 0.3,
        "ammoCategory": "shotgun-shell"
      },
      {
        "type": "gun-speed",
        "modifier": 0.7,
        "ammoCategory": "rocket"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "weapon-shooting-speed-5",
    "prerequisites": [
      "weapon-shooting-speed-4",
      "chemical-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 60,
    "effects": [
      {
        "type": "gun-speed",
        "modifier": 0.3,
        "ammoCategory": "bullet"
      },
      {
        "type": "gun-speed",
        "modifier": 0.4,
        "ammoCategory": "shotgun-shell"
      },
      {
        "type": "gun-speed",
        "modifier": 0.8,
        "ammoCategory": "cannon-shell"
      },
      {
        "type": "gun-speed",
        "modifier": 0.9,
        "ammoCategory": "rocket"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "weapon-shooting-speed-6",
    "prerequisites": [
      "weapon-shooting-speed-5",
      "utility-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 60,
    "effects": [
      {
        "type": "gun-speed",
        "modifier": 0.4,
        "ammoCategory": "bullet"
      },
      {
        "type": "gun-speed",
        "modifier": 0.4,
        "ammoCategory": "shotgun-shell"
      },
      {
        "type": "gun-speed",
        "modifier": 1.5,
        "ammoCategory": "cannon-shell"
      },
      {
        "type": "gun-speed",
        "modifier": 1.3,
        "ammoCategory": "rocket"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "laser-shooting-speed-1",
    "prerequisites": [
      "laser",
      "military-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 50,
    "time": 30,
    "effects": [
      {
        "type": "gun-speed",
        "modifier": 0.1,
        "ammoCategory": "laser"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "laser-shooting-speed-2",
    "prerequisites": [
      "laser-shooting-speed-1"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "gun-speed",
        "modifier": 0.2,
        "ammoCategory": "laser"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "laser-shooting-speed-3",
    "prerequisites": [
      "laser-shooting-speed-2"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 200,
    "time": 60,
    "effects": [
      {
        "type": "gun-speed",
        "modifier": 0.3,
        "ammoCategory": "laser"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "laser-shooting-speed-4",
    "prerequisites": [
      "laser-shooting-speed-3"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 200,
    "time": 60,
    "effects": [
      {
        "type": "gun-speed",
        "modifier": 0.3,
        "ammoCategory": "laser"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "laser-shooting-speed-5",
    "prerequisites": [
      "laser-shooting-speed-4",
      "utility-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 200,
    "time": 60,
    "effects": [
      {
        "type": "gun-speed",
        "modifier": 0.4,
        "ammoCategory": "laser"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "laser-shooting-speed-6",
    "prerequisites": [
      "laser-shooting-speed-5"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 350,
    "time": 60,
    "effects": [
      {
        "type": "gun-speed",
        "modifier": 0.4,
        "ammoCategory": "laser"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "laser-shooting-speed-7",
    "prerequisites": [
      "laser-shooting-speed-6"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 450,
    "time": 60,
    "effects": [
      {
        "type": "gun-speed",
        "modifier": 0.5,
        "ammoCategory": "laser"
      }
    ],
    "upgrade": true,
    "essential": false
  },
  {
    "name": "artillery-shell-range-1",
    "prerequisites": [
      "artillery",
      "space-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      },
      {
        "pack": "space-science-pack",
        "amount": 1
      }
    ],
    "countFormula": "2^L*1000",
    "time": 60,
    "effects": [
      {
        "type": "artillery-range",
        "modifier": 0.3
      }
    ],
    "iconPath": "__base__/graphics/technology/artillery-range.png",
    "upgrade": false,
    "essential": false,
    "maxLevel": "infinite"
  },
  {
    "name": "artillery-shell-speed-1",
    "prerequisites": [
      "artillery",
      "space-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      },
      {
        "pack": "space-science-pack",
        "amount": 1
      }
    ],
    "countFormula": "1000+3^(L-1)*1000",
    "time": 60,
    "effects": [
      {
        "type": "gun-speed",
        "modifier": 1,
        "ammoCategory": "artillery-shell"
      }
    ],
    "iconPath": "__base__/graphics/icons/artillery-shell.png",
    "upgrade": false,
    "essential": false,
    "maxLevel": "infinite"
  },
  {
    "name": "follower-robot-count-5",
    "prerequisites": [
      "follower-robot-count-4",
      "space-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      },
      {
        "pack": "space-science-pack",
        "amount": 1
      }
    ],
    "countFormula": "1000*(L-4)",
    "time": 30,
    "effects": [
      {
        "type": "maximum-following-robots-count",
        "modifier": 25
      }
    ],
    "iconPath": "__base__/graphics/technology/follower-robots.png",
    "upgrade": true,
    "essential": false,
    "maxLevel": "infinite"
  },
  {
    "name": "bulk-inserter",
    "prerequisites": [
      "fast-inserter",
      "logistics-2",
      "advanced-circuit"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 150,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "bulk-inserter"
      },
      {
        "type": "bulk-inserter-capacity-bonus",
        "modifier": 1
      }
    ],
    "iconPath": "__base__/graphics/technology/bulk-inserter.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "inserter-capacity-bonus-1",
    "prerequisites": [
      "bulk-inserter"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 200,
    "time": 30,
    "effects": [
      {
        "type": "bulk-inserter-capacity-bonus",
        "modifier": 1
      }
    ],
    "iconPath": "__base__/graphics/technology/inserter-capacity.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "inserter-capacity-bonus-2",
    "prerequisites": [
      "inserter-capacity-bonus-1"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 250,
    "time": 30,
    "effects": [
      {
        "type": "inserter-stack-size-bonus",
        "modifier": 1
      },
      {
        "type": "bulk-inserter-capacity-bonus",
        "modifier": 1
      }
    ],
    "iconPath": "__base__/graphics/technology/inserter-capacity.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "inserter-capacity-bonus-3",
    "prerequisites": [
      "inserter-capacity-bonus-2",
      "chemical-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 250,
    "time": 30,
    "effects": [
      {
        "type": "bulk-inserter-capacity-bonus",
        "modifier": 1
      }
    ],
    "iconPath": "__base__/graphics/technology/inserter-capacity.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "inserter-capacity-bonus-4",
    "prerequisites": [
      "inserter-capacity-bonus-3",
      "production-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      }
    ],
    "count": 250,
    "time": 30,
    "effects": [
      {
        "type": "bulk-inserter-capacity-bonus",
        "modifier": 1
      }
    ],
    "iconPath": "__base__/graphics/technology/inserter-capacity.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "inserter-capacity-bonus-5",
    "prerequisites": [
      "inserter-capacity-bonus-4"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      }
    ],
    "count": 300,
    "time": 30,
    "effects": [
      {
        "type": "bulk-inserter-capacity-bonus",
        "modifier": 2
      }
    ],
    "iconPath": "__base__/graphics/technology/inserter-capacity.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "inserter-capacity-bonus-6",
    "prerequisites": [
      "inserter-capacity-bonus-5"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      }
    ],
    "count": 400,
    "time": 30,
    "effects": [
      {
        "type": "bulk-inserter-capacity-bonus",
        "modifier": 2
      }
    ],
    "iconPath": "__base__/graphics/technology/inserter-capacity.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "inserter-capacity-bonus-7",
    "prerequisites": [
      "inserter-capacity-bonus-6",
      "utility-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 600,
    "time": 30,
    "effects": [
      {
        "type": "inserter-stack-size-bonus",
        "modifier": 1
      },
      {
        "type": "bulk-inserter-capacity-bonus",
        "modifier": 2
      }
    ],
    "iconPath": "__base__/graphics/technology/inserter-capacity.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "automation",
    "prerequisites": [
      "automation-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      }
    ],
    "count": 10,
    "time": 10,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "assembling-machine-1"
      },
      {
        "type": "unlock-recipe",
        "recipe": "long-handed-inserter"
      }
    ],
    "iconPath": "__base__/graphics/technology/automation-1.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "automation-2",
    "prerequisites": [
      "automation",
      "steel-processing",
      "logistic-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 40,
    "time": 15,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "assembling-machine-2"
      }
    ],
    "iconPath": "__base__/graphics/technology/automation-2.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "logistic-science-pack",
    "prerequisites": [
      "automation-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      }
    ],
    "count": 75,
    "time": 5,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "logistic-science-pack"
      }
    ],
    "iconPath": "__base__/graphics/technology/logistic-science-pack.png",
    "upgrade": false,
    "essential": true
  },
  {
    "name": "steel-processing",
    "prerequisites": [
      "automation-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      }
    ],
    "count": 50,
    "time": 5,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "steel-plate"
      },
      {
        "type": "unlock-recipe",
        "recipe": "steel-chest"
      }
    ],
    "iconPath": "__base__/graphics/technology/steel-processing.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "steel-axe",
    "prerequisites": [
      "steel-processing"
    ],
    "scienceCosts": [],
    "researchTrigger": {
      "type": "craft-item",
      "item": "steel-plate",
      "count": 50
    },
    "effects": [
      {
        "type": "character-mining-speed",
        "modifier": 1
      }
    ],
    "iconPath": "__base__/graphics/technology/steel-axe.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "military",
    "prerequisites": [
      "automation-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      }
    ],
    "count": 10,
    "time": 15,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "submachine-gun"
      },
      {
        "type": "unlock-recipe",
        "recipe": "shotgun"
      },
      {
        "type": "unlock-recipe",
        "recipe": "shotgun-shell"
      }
    ],
    "iconPath": "__base__/graphics/technology/military.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "military-2",
    "prerequisites": [
      "military",
      "steel-processing",
      "logistic-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 20,
    "time": 15,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "piercing-rounds-magazine"
      },
      {
        "type": "unlock-recipe",
        "recipe": "grenade"
      }
    ],
    "iconPath": "__base__/graphics/technology/military.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "fast-inserter",
    "prerequisites": [
      "automation-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      }
    ],
    "count": 30,
    "time": 15,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "fast-inserter"
      }
    ],
    "iconPath": "__base__/graphics/technology/fast-inserter.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "logistics",
    "prerequisites": [
      "automation-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      }
    ],
    "count": 20,
    "time": 15,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "underground-belt"
      },
      {
        "type": "unlock-recipe",
        "recipe": "splitter"
      }
    ],
    "iconPath": "__base__/graphics/technology/logistics-1.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "railway",
    "prerequisites": [
      "logistics-2",
      "engine"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 75,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "rail"
      },
      {
        "type": "unlock-recipe",
        "recipe": "locomotive"
      },
      {
        "type": "unlock-recipe",
        "recipe": "cargo-wagon"
      },
      {
        "type": "unlock-recipe",
        "recipe": "iron-stick"
      }
    ],
    "iconPath": "__base__/graphics/technology/railway.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "automated-rail-transportation",
    "prerequisites": [
      "railway"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 200,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "train-stop"
      },
      {
        "type": "unlock-recipe",
        "recipe": "rail-signal"
      },
      {
        "type": "unlock-recipe",
        "recipe": "rail-chain-signal"
      }
    ],
    "iconPath": "__base__/graphics/technology/automated-rail-transportation.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "automobilism",
    "prerequisites": [
      "logistics-2",
      "engine"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "car"
      }
    ],
    "iconPath": "__base__/graphics/technology/automobilism.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "lamp",
    "prerequisites": [
      "automation-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      }
    ],
    "count": 10,
    "time": 15,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "small-lamp"
      }
    ],
    "iconPath": "__base__/graphics/technology/lamp.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "solar-energy",
    "prerequisites": [
      "steel-processing",
      "logistic-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 250,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "solar-panel"
      }
    ],
    "iconPath": "__base__/graphics/technology/solar-energy.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "heavy-armor",
    "prerequisites": [
      "military",
      "steel-processing"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      }
    ],
    "count": 30,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "heavy-armor"
      }
    ],
    "iconPath": "__base__/graphics/technology/heavy-armor.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "gun-turret",
    "prerequisites": [
      "automation-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      }
    ],
    "count": 10,
    "time": 10,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "gun-turret"
      }
    ],
    "iconPath": "__base__/graphics/technology/gun-turret.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "research-speed-1",
    "prerequisites": [
      "automation-2"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "laboratory-speed",
        "modifier": 0.2
      }
    ],
    "iconPath": "__base__/graphics/technology/research-speed.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "research-speed-2",
    "prerequisites": [
      "research-speed-1"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 200,
    "time": 30,
    "effects": [
      {
        "type": "laboratory-speed",
        "modifier": 0.3
      }
    ],
    "iconPath": "__base__/graphics/technology/research-speed.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "electric-energy-distribution-1",
    "prerequisites": [
      "steel-processing",
      "logistic-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 120,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "medium-electric-pole"
      },
      {
        "type": "unlock-recipe",
        "recipe": "big-electric-pole"
      },
      {
        "type": "unlock-recipe",
        "recipe": "iron-stick"
      }
    ],
    "iconPath": "__base__/graphics/technology/electric-energy-distribution-1.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "advanced-material-processing",
    "prerequisites": [
      "steel-processing",
      "logistic-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 75,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "steel-furnace"
      }
    ],
    "iconPath": "__base__/graphics/technology/advanced-material-processing.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "concrete",
    "prerequisites": [
      "advanced-material-processing",
      "automation-2"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 250,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "concrete"
      },
      {
        "type": "unlock-recipe",
        "recipe": "hazard-concrete"
      },
      {
        "type": "unlock-recipe",
        "recipe": "refined-concrete"
      },
      {
        "type": "unlock-recipe",
        "recipe": "refined-hazard-concrete"
      },
      {
        "type": "unlock-recipe",
        "recipe": "iron-stick"
      }
    ],
    "iconPath": "__base__/graphics/technology/concrete.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "engine",
    "prerequisites": [
      "steel-processing",
      "logistic-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 15,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "engine-unit"
      }
    ],
    "iconPath": "__base__/graphics/technology/engine.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "landfill",
    "prerequisites": [
      "logistic-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 50,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "landfill"
      }
    ],
    "iconPath": "__base__/graphics/technology/landfill.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "logistics-2",
    "prerequisites": [
      "logistics",
      "logistic-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 200,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "fast-transport-belt"
      },
      {
        "type": "unlock-recipe",
        "recipe": "fast-underground-belt"
      },
      {
        "type": "unlock-recipe",
        "recipe": "fast-splitter"
      }
    ],
    "iconPath": "__base__/graphics/technology/logistics-2.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "toolbelt",
    "prerequisites": [
      "logistic-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "character-inventory-slots-bonus",
        "modifier": 10
      }
    ],
    "iconPath": "__base__/graphics/technology/toolbelt.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "stone-wall",
    "prerequisites": [
      "automation-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      }
    ],
    "count": 10,
    "time": 10,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "stone-wall"
      }
    ],
    "iconPath": "__base__/graphics/technology/stone-wall.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "gate",
    "prerequisites": [
      "stone-wall",
      "military-2"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "gate"
      }
    ],
    "iconPath": "__base__/graphics/technology/gate.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "chemical-science-pack",
    "prerequisites": [
      "advanced-circuit",
      "sulfur-processing"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 75,
    "time": 10,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "chemical-science-pack"
      }
    ],
    "iconPath": "__base__/graphics/technology/chemical-science-pack.png",
    "upgrade": false,
    "essential": true
  },
  {
    "name": "military-science-pack",
    "prerequisites": [
      "military-2",
      "stone-wall"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 30,
    "time": 15,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "military-science-pack"
      }
    ],
    "iconPath": "__base__/graphics/technology/military-science-pack.png",
    "upgrade": false,
    "essential": true
  },
  {
    "name": "production-science-pack",
    "prerequisites": [
      "productivity-module",
      "advanced-material-processing-2",
      "railway"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "production-science-pack"
      }
    ],
    "iconPath": "__base__/graphics/technology/production-science-pack.png",
    "upgrade": false,
    "essential": true
  },
  {
    "name": "utility-science-pack",
    "prerequisites": [
      "robotics",
      "processing-unit",
      "low-density-structure"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "utility-science-pack"
      }
    ],
    "iconPath": "__base__/graphics/technology/utility-science-pack.png",
    "upgrade": false,
    "essential": true
  },
  {
    "name": "space-science-pack",
    "prerequisites": [
      "rocket-silo"
    ],
    "scienceCosts": [],
    "researchTrigger": {
      "type": "send-item-to-orbit",
      "item": "satellite"
    },
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "space-science-pack"
      },
      {
        "type": "unlock-recipe",
        "recipe": "satellite"
      }
    ],
    "iconPath": "__base__/graphics/technology/space-science-pack.png",
    "upgrade": false,
    "essential": true
  },
  {
    "name": "ai-powered-infinite-research",
    "prerequisites": [
      "space-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      },
      {
        "pack": "space-science-pack",
        "amount": 1
      }
    ],
    "count": 999999999,
    "time": 30,
    "effects": [
      {
        "type": "custom",
        "description": "Unlock the secrets of the universe"
      }
    ],
    "iconPath": "__base__/graphics/technology/ai-powered-infinite-research.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "military-3",
    "prerequisites": [
      "chemical-science-pack",
      "military-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "poison-capsule"
      },
      {
        "type": "unlock-recipe",
        "recipe": "slowdown-capsule"
      },
      {
        "type": "unlock-recipe",
        "recipe": "piercing-shotgun-shell"
      }
    ],
    "iconPath": "__base__/graphics/technology/military.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "military-4",
    "prerequisites": [
      "military-3",
      "utility-science-pack",
      "explosives"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 150,
    "time": 45,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "cluster-grenade"
      },
      {
        "type": "unlock-recipe",
        "recipe": "combat-shotgun"
      }
    ],
    "iconPath": "__base__/graphics/technology/military.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "uranium-ammo",
    "prerequisites": [
      "uranium-processing",
      "military-4",
      "tank"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 1000,
    "time": 45,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "uranium-rounds-magazine"
      },
      {
        "type": "unlock-recipe",
        "recipe": "uranium-cannon-shell"
      },
      {
        "type": "unlock-recipe",
        "recipe": "explosive-uranium-cannon-shell"
      }
    ],
    "iconPath": "__base__/graphics/technology/uranium-ammo.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "atomic-bomb",
    "prerequisites": [
      "military-4",
      "kovarex-enrichment-process",
      "rocketry"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 5000,
    "time": 45,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "atomic-bomb"
      }
    ],
    "iconPath": "__base__/graphics/technology/atomic-bomb.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "automation-3",
    "prerequisites": [
      "speed-module",
      "production-science-pack",
      "electric-engine"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      }
    ],
    "count": 150,
    "time": 60,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "assembling-machine-3"
      }
    ],
    "iconPath": "__base__/graphics/technology/automation-3.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "explosives",
    "prerequisites": [
      "sulfur-processing"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 15,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "explosives"
      }
    ],
    "iconPath": "__base__/graphics/technology/explosives.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "cliff-explosives",
    "prerequisites": [
      "explosives",
      "military-2"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 200,
    "time": 15,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "cliff-explosives"
      },
      {
        "type": "cliff-deconstruction-enabled",
        "modifier": true
      }
    ],
    "iconPath": "__base__/graphics/technology/cliff-explosives.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "flammables",
    "prerequisites": [
      "oil-processing"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 50,
    "time": 30,
    "effects": [],
    "iconPath": "__base__/graphics/technology/flammables.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "land-mine",
    "prerequisites": [
      "explosives",
      "military-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "land-mine"
      }
    ],
    "iconPath": "__base__/graphics/technology/land-mine.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "flamethrower",
    "prerequisites": [
      "flammables",
      "military-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 50,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "flamethrower"
      },
      {
        "type": "unlock-recipe",
        "recipe": "flamethrower-ammo"
      },
      {
        "type": "unlock-recipe",
        "recipe": "flamethrower-turret"
      }
    ],
    "iconPath": "__base__/graphics/technology/flamethrower.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "advanced-circuit",
    "prerequisites": [
      "plastics"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 200,
    "time": 15,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "advanced-circuit"
      }
    ],
    "iconPath": "__base__/graphics/technology/advanced-circuit.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "processing-unit",
    "prerequisites": [
      "chemical-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 300,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "processing-unit"
      }
    ],
    "iconPath": "__base__/graphics/technology/processing-unit.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "fluid-wagon",
    "prerequisites": [
      "railway",
      "fluid-handling"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 200,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "fluid-wagon"
      }
    ],
    "iconPath": "__base__/graphics/technology/fluid-wagon.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "braking-force-1",
    "prerequisites": [
      "railway",
      "chemical-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "train-braking-force-bonus",
        "modifier": 0.1
      }
    ],
    "iconPath": "__base__/graphics/technology/braking-force.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "braking-force-2",
    "prerequisites": [
      "braking-force-1"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 200,
    "time": 30,
    "effects": [
      {
        "type": "train-braking-force-bonus",
        "modifier": 0.15
      }
    ],
    "iconPath": "__base__/graphics/technology/braking-force.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "braking-force-3",
    "prerequisites": [
      "braking-force-2",
      "production-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      }
    ],
    "count": 250,
    "time": 30,
    "effects": [
      {
        "type": "train-braking-force-bonus",
        "modifier": 0.15
      }
    ],
    "iconPath": "__base__/graphics/technology/braking-force.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "braking-force-4",
    "prerequisites": [
      "braking-force-3"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      }
    ],
    "count": 350,
    "time": 30,
    "effects": [
      {
        "type": "train-braking-force-bonus",
        "modifier": 0.15
      }
    ],
    "iconPath": "__base__/graphics/technology/braking-force.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "braking-force-5",
    "prerequisites": [
      "braking-force-4"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      }
    ],
    "count": 450,
    "time": 35,
    "effects": [
      {
        "type": "train-braking-force-bonus",
        "modifier": 0.15
      }
    ],
    "iconPath": "__base__/graphics/technology/braking-force.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "braking-force-6",
    "prerequisites": [
      "braking-force-5",
      "utility-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 550,
    "time": 45,
    "effects": [
      {
        "type": "train-braking-force-bonus",
        "modifier": 0.15
      }
    ],
    "iconPath": "__base__/graphics/technology/braking-force.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "braking-force-7",
    "prerequisites": [
      "braking-force-6"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 650,
    "time": 60,
    "effects": [
      {
        "type": "train-braking-force-bonus",
        "modifier": 0.15
      }
    ],
    "iconPath": "__base__/graphics/technology/braking-force.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "tank",
    "prerequisites": [
      "automobilism",
      "military-3",
      "explosives"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 250,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "tank"
      },
      {
        "type": "unlock-recipe",
        "recipe": "cannon-shell"
      },
      {
        "type": "unlock-recipe",
        "recipe": "explosive-cannon-shell"
      }
    ],
    "iconPath": "__base__/graphics/technology/tank.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "logistics-3",
    "prerequisites": [
      "production-science-pack",
      "lubricant"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      }
    ],
    "count": 300,
    "time": 15,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "express-transport-belt"
      },
      {
        "type": "unlock-recipe",
        "recipe": "express-underground-belt"
      },
      {
        "type": "unlock-recipe",
        "recipe": "express-splitter"
      }
    ],
    "iconPath": "__base__/graphics/technology/logistics-3.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "laser",
    "prerequisites": [
      "battery",
      "chemical-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [],
    "iconPath": "__base__/graphics/technology/laser.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "rocketry",
    "prerequisites": [
      "explosives",
      "flammables",
      "military-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 120,
    "time": 15,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "rocket-launcher"
      },
      {
        "type": "unlock-recipe",
        "recipe": "rocket"
      }
    ],
    "iconPath": "__base__/graphics/technology/rocketry.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "explosive-rocketry",
    "prerequisites": [
      "rocketry",
      "military-3"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "explosive-rocket"
      }
    ],
    "iconPath": "__base__/graphics/technology/explosive-rocketry.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "modular-armor",
    "prerequisites": [
      "heavy-armor",
      "advanced-circuit"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "modular-armor"
      }
    ],
    "iconPath": "__base__/graphics/technology/armor-making.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "power-armor",
    "prerequisites": [
      "modular-armor",
      "electric-engine",
      "processing-unit"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 200,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "power-armor"
      }
    ],
    "iconPath": "__base__/graphics/technology/power-armor.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "power-armor-mk2",
    "prerequisites": [
      "power-armor",
      "military-4",
      "speed-module-2",
      "efficiency-module-2"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 400,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "power-armor-mk2"
      }
    ],
    "iconPath": "__base__/graphics/technology/power-armor-mk2.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "laser-turret",
    "prerequisites": [
      "laser",
      "military-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 150,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "laser-turret"
      }
    ],
    "iconPath": "__base__/graphics/technology/laser-turret.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "robotics",
    "prerequisites": [
      "electric-engine",
      "battery"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 75,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "flying-robot-frame"
      }
    ],
    "iconPath": "__base__/graphics/technology/robotics.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "rocket-fuel",
    "prerequisites": [
      "flammables",
      "advanced-oil-processing"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 300,
    "time": 45,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "rocket-fuel"
      }
    ],
    "iconPath": "__base__/graphics/technology/rocket-fuel.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "low-density-structure",
    "prerequisites": [
      "advanced-material-processing",
      "chemical-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 300,
    "time": 45,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "low-density-structure"
      }
    ],
    "iconPath": "__base__/graphics/technology/low-density-structure.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "rocket-silo",
    "prerequisites": [
      "concrete",
      "rocket-fuel",
      "electric-energy-accumulators",
      "solar-energy",
      "utility-science-pack",
      "speed-module-3",
      "productivity-module-3",
      "radar"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 1000,
    "time": 60,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "rocket-silo"
      },
      {
        "type": "unlock-recipe",
        "recipe": "rocket-part"
      },
      {
        "type": "unlock-recipe",
        "recipe": "cargo-landing-pad"
      }
    ],
    "iconPath": "__base__/graphics/technology/rocket-silo.png",
    "upgrade": false,
    "essential": true
  },
  {
    "name": "research-speed-3",
    "prerequisites": [
      "research-speed-2",
      "chemical-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 250,
    "time": 30,
    "effects": [
      {
        "type": "laboratory-speed",
        "modifier": 0.4
      }
    ],
    "iconPath": "__base__/graphics/technology/research-speed.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "research-speed-4",
    "prerequisites": [
      "research-speed-3"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 500,
    "time": 30,
    "effects": [
      {
        "type": "laboratory-speed",
        "modifier": 0.5
      }
    ],
    "iconPath": "__base__/graphics/technology/research-speed.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "research-speed-5",
    "prerequisites": [
      "research-speed-4",
      "production-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      }
    ],
    "count": 500,
    "time": 30,
    "effects": [
      {
        "type": "laboratory-speed",
        "modifier": 0.5
      }
    ],
    "iconPath": "__base__/graphics/technology/research-speed.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "research-speed-6",
    "prerequisites": [
      "research-speed-5",
      "utility-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 500,
    "time": 30,
    "effects": [
      {
        "type": "laboratory-speed",
        "modifier": 0.6
      }
    ],
    "iconPath": "__base__/graphics/technology/research-speed.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "electric-energy-distribution-2",
    "prerequisites": [
      "electric-energy-distribution-1",
      "chemical-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 45,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "substation"
      }
    ],
    "iconPath": "__base__/graphics/technology/electric-energy-distribution-2.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "electric-energy-accumulators",
    "prerequisites": [
      "electric-energy-distribution-1",
      "battery"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 150,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "accumulator"
      }
    ],
    "iconPath": "__base__/graphics/technology/electric-energy-acumulators.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "advanced-material-processing-2",
    "prerequisites": [
      "advanced-material-processing",
      "chemical-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 250,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "electric-furnace"
      }
    ],
    "iconPath": "__base__/graphics/technology/advanced-material-processing-2.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "effect-transmission",
    "prerequisites": [
      "processing-unit",
      "production-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      }
    ],
    "count": 75,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "beacon"
      }
    ],
    "iconPath": "__base__/graphics/technology/effect-transmission.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "lubricant",
    "prerequisites": [
      "advanced-oil-processing"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 50,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "lubricant"
      }
    ],
    "iconPath": "__base__/graphics/technology/lubricant.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "electric-engine",
    "prerequisites": [
      "lubricant"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 50,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "electric-engine-unit"
      }
    ],
    "iconPath": "__base__/graphics/technology/electric-engine.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "battery",
    "prerequisites": [
      "sulfur-processing"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 150,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "battery"
      }
    ],
    "iconPath": "__base__/graphics/technology/battery.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "construction-robotics",
    "prerequisites": [
      "robotics"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "roboport"
      },
      {
        "type": "unlock-recipe",
        "recipe": "passive-provider-chest"
      },
      {
        "type": "unlock-recipe",
        "recipe": "storage-chest"
      },
      {
        "type": "unlock-recipe",
        "recipe": "construction-robot"
      },
      {
        "type": "create-ghost-on-entity-death",
        "modifier": true
      },
      {
        "type": "unlock-logistic-network",
        "modifier": true,
        "hidden": true
      }
    ],
    "iconPath": "__base__/graphics/technology/construction-robotics.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "logistic-robotics",
    "prerequisites": [
      "robotics"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 250,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "roboport"
      },
      {
        "type": "unlock-recipe",
        "recipe": "passive-provider-chest"
      },
      {
        "type": "unlock-recipe",
        "recipe": "storage-chest"
      },
      {
        "type": "unlock-recipe",
        "recipe": "logistic-robot"
      },
      {
        "type": "character-logistic-requests",
        "modifier": true
      },
      {
        "type": "character-logistic-trash-slots",
        "modifier": 30
      },
      {
        "type": "unlock-logistic-network",
        "modifier": true,
        "hidden": true
      }
    ],
    "iconPath": "__base__/graphics/technology/logistic-robotics.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "logistic-system",
    "prerequisites": [
      "utility-science-pack",
      "logistic-robotics"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 500,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "active-provider-chest"
      },
      {
        "type": "unlock-recipe",
        "recipe": "requester-chest"
      },
      {
        "type": "unlock-recipe",
        "recipe": "buffer-chest"
      },
      {
        "type": "vehicle-logistics",
        "modifier": true
      }
    ],
    "iconPath": "__base__/graphics/technology/logistic-system.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "worker-robots-speed-1",
    "prerequisites": [
      "robotics"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 50,
    "time": 30,
    "effects": [
      {
        "type": "worker-robot-speed",
        "modifier": 0.35
      }
    ],
    "iconPath": "__base__/graphics/technology/worker-robots-speed.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "worker-robots-speed-2",
    "prerequisites": [
      "worker-robots-speed-1"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "worker-robot-speed",
        "modifier": 0.4
      }
    ],
    "iconPath": "__base__/graphics/technology/worker-robots-speed.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "worker-robots-speed-3",
    "prerequisites": [
      "worker-robots-speed-2",
      "utility-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 150,
    "time": 60,
    "effects": [
      {
        "type": "worker-robot-speed",
        "modifier": 0.45
      }
    ],
    "iconPath": "__base__/graphics/technology/worker-robots-speed.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "worker-robots-speed-4",
    "prerequisites": [
      "worker-robots-speed-3"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 250,
    "time": 60,
    "effects": [
      {
        "type": "worker-robot-speed",
        "modifier": 0.55
      }
    ],
    "iconPath": "__base__/graphics/technology/worker-robots-speed.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "worker-robots-speed-5",
    "prerequisites": [
      "worker-robots-speed-4",
      "production-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 500,
    "time": 60,
    "effects": [
      {
        "type": "worker-robot-speed",
        "modifier": 0.65
      }
    ],
    "iconPath": "__base__/graphics/technology/worker-robots-speed.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "worker-robots-speed-6",
    "prerequisites": [
      "worker-robots-speed-5",
      "space-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      },
      {
        "pack": "space-science-pack",
        "amount": 1
      }
    ],
    "countFormula": "2^(L-6)*1000",
    "time": 60,
    "effects": [
      {
        "type": "worker-robot-speed",
        "modifier": 0.65
      }
    ],
    "iconPath": "__base__/graphics/technology/worker-robots-speed.png",
    "upgrade": true,
    "essential": false,
    "maxLevel": "infinite"
  },
  {
    "name": "worker-robots-storage-1",
    "prerequisites": [
      "robotics"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 200,
    "time": 30,
    "effects": [
      {
        "type": "worker-robot-storage",
        "modifier": 1
      }
    ],
    "iconPath": "__base__/graphics/technology/worker-robots-storage.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "worker-robots-storage-2",
    "prerequisites": [
      "worker-robots-storage-1",
      "production-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      }
    ],
    "count": 300,
    "time": 60,
    "effects": [
      {
        "type": "worker-robot-storage",
        "modifier": 1
      }
    ],
    "iconPath": "__base__/graphics/technology/worker-robots-storage.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "worker-robots-storage-3",
    "prerequisites": [
      "worker-robots-storage-2",
      "utility-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 450,
    "time": 60,
    "effects": [
      {
        "type": "worker-robot-storage",
        "modifier": 1
      }
    ],
    "iconPath": "__base__/graphics/technology/worker-robots-storage.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "energy-shield-equipment",
    "prerequisites": [
      "solar-panel-equipment",
      "military-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 150,
    "time": 15,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "energy-shield-equipment"
      }
    ],
    "iconPath": "__base__/graphics/technology/energy-shield-equipment.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "night-vision-equipment",
    "prerequisites": [
      "solar-panel-equipment"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 50,
    "time": 15,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "night-vision-equipment"
      }
    ],
    "iconPath": "__base__/graphics/technology/night-vision-equipment.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "belt-immunity-equipment",
    "prerequisites": [
      "solar-panel-equipment"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 50,
    "time": 15,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "belt-immunity-equipment"
      }
    ],
    "iconPath": "__base__/graphics/technology/belt-immunity-equipment.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "energy-shield-mk2-equipment",
    "prerequisites": [
      "energy-shield-equipment",
      "military-3",
      "low-density-structure",
      "power-armor"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 200,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "energy-shield-mk2-equipment"
      }
    ],
    "iconPath": "__base__/graphics/technology/energy-shield-mk2-equipment.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "battery-equipment",
    "prerequisites": [
      "battery",
      "solar-panel-equipment"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 50,
    "time": 15,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "battery-equipment"
      }
    ],
    "iconPath": "__base__/graphics/technology/battery-equipment.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "battery-mk2-equipment",
    "prerequisites": [
      "battery-equipment",
      "low-density-structure",
      "power-armor"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "battery-mk2-equipment"
      }
    ],
    "iconPath": "__base__/graphics/technology/battery-mk2-equipment.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "solar-panel-equipment",
    "prerequisites": [
      "modular-armor",
      "solar-energy"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 15,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "solar-panel-equipment"
      }
    ],
    "iconPath": "__base__/graphics/technology/solar-panel-equipment.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "personal-laser-defense-equipment",
    "prerequisites": [
      "laser-turret",
      "military-3",
      "low-density-structure",
      "power-armor",
      "solar-panel-equipment"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "personal-laser-defense-equipment"
      }
    ],
    "iconPath": "__base__/graphics/technology/personal-laser-defense-equipment.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "discharge-defense-equipment",
    "prerequisites": [
      "laser-turret",
      "military-3",
      "power-armor",
      "solar-panel-equipment"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "discharge-defense-equipment"
      }
    ],
    "iconPath": "__base__/graphics/technology/discharge-defense-equipment.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "fission-reactor-equipment",
    "prerequisites": [
      "utility-science-pack",
      "power-armor",
      "military-science-pack",
      "nuclear-power"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 200,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "fission-reactor-equipment"
      }
    ],
    "iconPath": "__base__/graphics/technology/fission-reactor-equipment.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "exoskeleton-equipment",
    "prerequisites": [
      "processing-unit",
      "electric-engine",
      "solar-panel-equipment"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 50,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "exoskeleton-equipment"
      }
    ],
    "iconPath": "__base__/graphics/technology/exoskeleton-equipment.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "personal-roboport-equipment",
    "prerequisites": [
      "construction-robotics",
      "solar-panel-equipment"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 50,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "personal-roboport-equipment"
      }
    ],
    "iconPath": "__base__/graphics/technology/personal-roboport-equipment.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "personal-roboport-mk2-equipment",
    "prerequisites": [
      "personal-roboport-equipment",
      "utility-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 250,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "personal-roboport-mk2-equipment"
      }
    ],
    "iconPath": "__base__/graphics/technology/personal-roboport-mk2-equipment.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "fluid-handling",
    "prerequisites": [
      "automation-2",
      "engine"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 50,
    "time": 15,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "storage-tank"
      },
      {
        "type": "unlock-recipe",
        "recipe": "pump"
      },
      {
        "type": "unlock-recipe",
        "recipe": "barrel"
      }
    ],
    "iconPath": "__base__/graphics/technology/fluid-handling.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "oil-gathering",
    "prerequisites": [
      "fluid-handling"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "pumpjack"
      }
    ],
    "iconPath": "__base__/graphics/technology/oil-gathering.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "oil-processing",
    "prerequisites": [
      "oil-gathering"
    ],
    "scienceCosts": [],
    "researchTrigger": {
      "type": "construct-item",
      "item": "pumpjack",
      "count": 1
    },
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "oil-refinery"
      },
      {
        "type": "unlock-recipe",
        "recipe": "chemical-plant"
      },
      {
        "type": "unlock-recipe",
        "recipe": "basic-oil-processing"
      },
      {
        "type": "unlock-recipe",
        "recipe": "solid-fuel-from-petroleum-gas"
      }
    ],
    "iconPath": "__base__/graphics/technology/oil-processing.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "advanced-oil-processing",
    "prerequisites": [
      "chemical-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 75,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "heavy-oil-cracking"
      },
      {
        "type": "unlock-recipe",
        "recipe": "light-oil-cracking"
      }
    ],
    "iconPath": "__base__/graphics/technology/advanced-oil-processing.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "coal-liquefaction",
    "prerequisites": [
      "advanced-oil-processing",
      "production-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      }
    ],
    "count": 200,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "coal-liquefaction"
      }
    ],
    "iconPath": "__base__/graphics/technology/coal-liquefaction.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "sulfur-processing",
    "prerequisites": [
      "oil-processing"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 150,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "sulfuric-acid"
      },
      {
        "type": "unlock-recipe",
        "recipe": "sulfur"
      }
    ],
    "iconPath": "__base__/graphics/technology/sulfur-processing.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "plastics",
    "prerequisites": [
      "oil-processing"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 200,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "plastic-bar"
      }
    ],
    "iconPath": "__base__/graphics/technology/plastics.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "modules",
    "prerequisites": [
      "advanced-circuit"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [],
    "iconPath": "__base__/graphics/technology/module.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "speed-module",
    "prerequisites": [
      "modules"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 50,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "speed-module"
      }
    ],
    "iconPath": "__base__/graphics/technology/speed-module-1.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "speed-module-2",
    "prerequisites": [
      "speed-module",
      "processing-unit"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 75,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "speed-module-2"
      }
    ],
    "iconPath": "__base__/graphics/technology/speed-module-2.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "speed-module-3",
    "prerequisites": [
      "speed-module-2",
      "production-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      }
    ],
    "count": 300,
    "time": 60,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "speed-module-3"
      }
    ],
    "iconPath": "__base__/graphics/technology/speed-module-3.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "productivity-module",
    "prerequisites": [
      "modules"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 50,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "productivity-module"
      }
    ],
    "iconPath": "__base__/graphics/technology/productivity-module-1.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "productivity-module-2",
    "prerequisites": [
      "productivity-module",
      "processing-unit"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 75,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "productivity-module-2"
      }
    ],
    "iconPath": "__base__/graphics/technology/productivity-module-2.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "productivity-module-3",
    "prerequisites": [
      "productivity-module-2",
      "production-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      }
    ],
    "count": 300,
    "time": 60,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "productivity-module-3"
      }
    ],
    "iconPath": "__base__/graphics/technology/productivity-module-3.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "efficiency-module",
    "prerequisites": [
      "modules"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 50,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "efficiency-module"
      }
    ],
    "iconPath": "__base__/graphics/technology/efficiency-module-1.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "efficiency-module-2",
    "prerequisites": [
      "efficiency-module",
      "processing-unit"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 75,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "efficiency-module-2"
      }
    ],
    "iconPath": "__base__/graphics/technology/efficiency-module-2.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "efficiency-module-3",
    "prerequisites": [
      "efficiency-module-2",
      "production-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      }
    ],
    "count": 300,
    "time": 60,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "efficiency-module-3"
      }
    ],
    "iconPath": "__base__/graphics/technology/efficiency-module-3.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "defender",
    "prerequisites": [
      "military-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "defender-capsule"
      },
      {
        "type": "maximum-following-robots-count",
        "modifier": 4
      }
    ],
    "iconPath": "__base__/graphics/technology/defender.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "distractor",
    "prerequisites": [
      "defender",
      "military-3",
      "laser"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 200,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "distractor-capsule"
      }
    ],
    "iconPath": "__base__/graphics/technology/distractor.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "destroyer",
    "prerequisites": [
      "military-4",
      "distractor",
      "speed-module"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 300,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "destroyer-capsule"
      }
    ],
    "iconPath": "__base__/graphics/technology/destroyer.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "uranium-mining",
    "prerequisites": [
      "chemical-science-pack",
      "concrete"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "mining-with-fluid",
        "modifier": true
      }
    ],
    "iconPath": "__base__/graphics/technology/uranium-mining.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "uranium-processing",
    "prerequisites": [
      "uranium-mining"
    ],
    "scienceCosts": [],
    "researchTrigger": {
      "type": "construct-item",
      "item": "uranium-miner",
      "count": 1
    },
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "centrifuge"
      },
      {
        "type": "unlock-recipe",
        "recipe": "uranium-processing"
      }
    ],
    "iconPath": "__base__/graphics/technology/uranium-processing.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "nuclear-power",
    "prerequisites": [
      "uranium-processing"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 800,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "nuclear-reactor"
      },
      {
        "type": "unlock-recipe",
        "recipe": "heat-exchanger"
      },
      {
        "type": "unlock-recipe",
        "recipe": "heat-pipe"
      },
      {
        "type": "unlock-recipe",
        "recipe": "steam-turbine"
      },
      {
        "type": "unlock-recipe",
        "recipe": "uranium-fuel-cell"
      }
    ],
    "iconPath": "__base__/graphics/technology/nuclear-power.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "kovarex-enrichment-process",
    "prerequisites": [
      "production-science-pack",
      "uranium-processing",
      "rocket-fuel"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      }
    ],
    "count": 1500,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "kovarex-enrichment-process"
      },
      {
        "type": "unlock-recipe",
        "recipe": "nuclear-fuel"
      }
    ],
    "iconPath": "__base__/graphics/technology/kovarex-enrichment-process.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "nuclear-fuel-reprocessing",
    "prerequisites": [
      "nuclear-power",
      "production-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      }
    ],
    "count": 50,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "nuclear-fuel-reprocessing"
      }
    ],
    "iconPath": "__base__/graphics/technology/nuclear-fuel-reprocessing.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "mining-productivity-1",
    "prerequisites": [
      "advanced-circuit"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 250,
    "time": 60,
    "effects": [
      {
        "type": "mining-drill-productivity-bonus",
        "modifier": 0.1
      }
    ],
    "iconPath": "__base__/graphics/technology/mining-productivity.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "mining-productivity-2",
    "prerequisites": [
      "mining-productivity-1",
      "chemical-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 500,
    "time": 60,
    "effects": [
      {
        "type": "mining-drill-productivity-bonus",
        "modifier": 0.1
      }
    ],
    "iconPath": "__base__/graphics/technology/mining-productivity.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "mining-productivity-3",
    "prerequisites": [
      "mining-productivity-2",
      "production-science-pack",
      "utility-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 1000,
    "time": 60,
    "effects": [
      {
        "type": "mining-drill-productivity-bonus",
        "modifier": 0.1
      }
    ],
    "iconPath": "__base__/graphics/technology/mining-productivity.png",
    "upgrade": true,
    "essential": false
  },
  {
    "name": "mining-productivity-4",
    "prerequisites": [
      "mining-productivity-3",
      "space-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      },
      {
        "pack": "space-science-pack",
        "amount": 1
      }
    ],
    "countFormula": "2500*(L - 3)",
    "time": 60,
    "effects": [
      {
        "type": "mining-drill-productivity-bonus",
        "modifier": 0.1
      }
    ],
    "iconPath": "__base__/graphics/technology/mining-productivity.png",
    "upgrade": true,
    "essential": false,
    "maxLevel": "infinite"
  },
  {
    "name": "artillery",
    "prerequisites": [
      "military-4",
      "tank",
      "concrete",
      "radar"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 2000,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "artillery-wagon"
      },
      {
        "type": "unlock-recipe",
        "recipe": "artillery-turret"
      },
      {
        "type": "unlock-recipe",
        "recipe": "artillery-shell"
      }
    ],
    "iconPath": "__base__/graphics/technology/artillery.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "spidertron",
    "prerequisites": [
      "military-4",
      "exoskeleton-equipment",
      "fission-reactor-equipment",
      "rocketry",
      "efficiency-module-3",
      "radar"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "production-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 2500,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "spidertron"
      }
    ],
    "iconPath": "__base__/graphics/technology/spidertron.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "circuit-network",
    "prerequisites": [
      "logistic-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 15,
    "effects": [
      {
        "type": "unlock-circuit-network",
        "modifier": true
      },
      {
        "type": "unlock-recipe",
        "recipe": "arithmetic-combinator"
      },
      {
        "type": "unlock-recipe",
        "recipe": "decider-combinator"
      },
      {
        "type": "unlock-recipe",
        "recipe": "constant-combinator"
      },
      {
        "type": "unlock-recipe",
        "recipe": "power-switch"
      },
      {
        "type": "unlock-recipe",
        "recipe": "programmable-speaker"
      },
      {
        "type": "unlock-recipe",
        "recipe": "display-panel"
      },
      {
        "type": "unlock-recipe",
        "recipe": "iron-stick"
      }
    ],
    "iconPath": "__base__/graphics/technology/circuit-network.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "advanced-combinators",
    "prerequisites": [
      "circuit-network",
      "chemical-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      }
    ],
    "count": 50,
    "time": 30,
    "effects": [
      {
        "type": "unlock-recipe",
        "recipe": "selector-combinator"
      }
    ],
    "iconPath": "__base__/graphics/technology/advanced-combinators.png",
    "upgrade": false,
    "essential": false
  },
  {
    "name": "follower-robot-count-1",
    "prerequisites": [
      "defender"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 100,
    "time": 30,
    "effects": [
      {
        "type": "maximum-following-robots-count",
        "modifier": 5
      }
    ],
    "iconPath": "__base__/graphics/technology/follower-robots.png",
    "upgrade": true
  },
  {
    "name": "follower-robot-count-2",
    "prerequisites": [
      "follower-robot-count-1"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 200,
    "time": 30,
    "effects": [
      {
        "type": "maximum-following-robots-count",
        "modifier": 10
      }
    ],
    "iconPath": "__base__/graphics/technology/follower-robots.png",
    "upgrade": true
  },
  {
    "name": "follower-robot-count-3",
    "prerequisites": [
      "follower-robot-count-2",
      "chemical-science-pack"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      }
    ],
    "count": 300,
    "time": 30,
    "effects": [
      {
        "type": "maximum-following-robots-count",
        "modifier": 10
      }
    ],
    "iconPath": "__base__/graphics/technology/follower-robots.png",
    "upgrade": true
  },
  {
    "name": "follower-robot-count-4",
    "prerequisites": [
      "follower-robot-count-3",
      "destroyer"
    ],
    "scienceCosts": [
      {
        "pack": "automation-science-pack",
        "amount": 1
      },
      {
        "pack": "logistic-science-pack",
        "amount": 1
      },
      {
        "pack": "chemical-science-pack",
        "amount": 1
      },
      {
        "pack": "military-science-pack",
        "amount": 1
      },
      {
        "pack": "utility-science-pack",
        "amount": 1
      }
    ],
    "count": 400,
    "time": 30,
    "effects": [
      {
        "type": "maximum-following-robots-count",
        "modifier": 20
      }
    ],
    "iconPath": "__base__/graphics/technology/follower-robots.png",
    "upgrade": true
  }
];

// Keep the normalized catalog aligned with the upstream per-level research
// counts for upgrade families. Science pack amounts remain one per unit.
const canonicalTechnologyCountOverrides: Record<string, number> = {
  'physical-projectile-damage-2': 200,
  'physical-projectile-damage-3': 300,
  'physical-projectile-damage-4': 400,
  'physical-projectile-damage-5': 500,
  'physical-projectile-damage-6': 600,
  'weapon-shooting-speed-2': 200,
  'weapon-shooting-speed-3': 300,
  'weapon-shooting-speed-4': 400,
  'weapon-shooting-speed-5': 500,
  'weapon-shooting-speed-6': 600,
  'stronger-explosives-2': 200,
  'stronger-explosives-3': 300,
  'stronger-explosives-4': 400,
  'stronger-explosives-5': 500,
  'stronger-explosives-6': 600,
  'refined-flammables-2': 200,
  'refined-flammables-3': 300,
  'refined-flammables-4': 400,
  'refined-flammables-5': 500,
  'refined-flammables-6': 600,
  'laser-weapons-damage-2': 200,
  'laser-weapons-damage-3': 300,
  'laser-weapons-damage-4': 400,
  'laser-weapons-damage-5': 500,
  'laser-weapons-damage-6': 600,
};

const canonicalScienceCostOverrides: Record<string, TechnologyScienceCost[]> = {
  'physical-projectile-damage-3': [
    { pack: 'automation-science-pack', amount: 1 },
    { pack: 'logistic-science-pack', amount: 1 },
    { pack: 'military-science-pack', amount: 1 },
  ],
};

export const technologyCatalog: TechnologyDefinition[] = rawTechnologyCatalog.map((technology) => ({
  ...technology,
  ...(canonicalTechnologyCountOverrides[technology.name] ? { count: canonicalTechnologyCountOverrides[technology.name] } : {}),
  ...(canonicalScienceCostOverrides[technology.name] ? { scienceCosts: canonicalScienceCostOverrides[technology.name] } : {}),
}));

import { describe, it, expect } from "vitest";
import { loadMap } from "../mapLoader.js";
import ExampleMap from "../maps/ExampleMap.json";
import {
  STARTING_AP,
  STARTING_AP_CAP,
  STARTING_ARMY,
  STARTING_GOLD,
} from "../constants.js";

describe("loadMap", () => {
  it("produces a GameState from ExampleMap.json without throwing", () => {
    const state = loadMap(ExampleMap);
    expect(state).toBeDefined();
    expect(state.winner).toBeNull();
  });

  it("builds a 20×20 sector grid", () => {
    const state = loadMap(ExampleMap);
    expect(state.sectors.length).toBe(20);
    for (const row of state.sectors) expect(row.length).toBe(20);
  });

  it("sets turn = 1 and activePlayerId = playerOrder[0]", () => {
    const state = loadMap(ExampleMap);
    expect(state.turn).toBe(1);
    expect(state.activePlayerId).toBe(state.playerOrder[0]);
  });

  it("places player1 first in playerOrder", () => {
    const state = loadMap(ExampleMap);
    expect(state.playerOrder[0]).toBe("player1");
  });

  it("initialises correct starting resources for every player", () => {
    const state = loadMap(ExampleMap);
    for (const player of Object.values(state.players)) {
      expect(player.resources.ap).toBe(STARTING_AP);
      expect(player.resources.apCap).toBe(STARTING_AP_CAP);
      expect(player.resources.gold).toBe(STARTING_GOLD);
      expect(player.resources.army).toBe(STARTING_ARMY);
      expect(player.resources.xp).toBe(0);
    }
  });

  it("constructs a Town Hall building on 'town_hall' feature tiles", () => {
    const state = loadMap(ExampleMap);
    let found = false;
    for (const row of state.sectors) {
      for (const sector of row) {
        if (sector.building?.type === "town_hall") {
          found = true;
          expect(sector.building.hp).toBe(3);
          expect(sector.building.maxHp).toBe(3);
        }
      }
    }
    expect(found).toBe(true);
  });

  it("assigns sectors to the correct players based on owner field", () => {
    const state = loadMap(ExampleMap);
    // player1 town hall at (4,4) according to ExampleMap
    expect(state.sectors[4]![4]!.owner).toBe("player1");
  });

  it("preserves gold_vein flag from JSON", () => {
    const state = loadMap(ExampleMap);
    // (4,2) has gold_vein: true in ExampleMap (player1 N tip facing top edge)
    expect(state.sectors[2]![4]!.goldVein).toBe(true);
  });

  it("sets feature = 'tree' or 'mountain' on appropriate tiles", () => {
    const state = loadMap(ExampleMap);
    // (0,0) has feature: 'mountain' in ExampleMap
    expect(state.sectors[0]![0]!.feature).toBe("mountain");
    // (10,0) has feature: 'tree'
    expect(state.sectors[0]![10]!.feature).toBe("tree");
  });
});

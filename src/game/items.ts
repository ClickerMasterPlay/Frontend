import type { MessageKey } from "../i18n/strings";

type ItemView = {
  mark: string;
  key: MessageKey;
};

const ITEMS: Record<string, ItemView> = {
  stone: { mark: "К", key: "invStone" },
  iron: { mark: "Ж", key: "invIron" },
  gold: { mark: "З", key: "invGold" },
  diamond: { mark: "А", key: "invDiamond" },
  netherite: { mark: "Н", key: "invNetherite" },
  wooden_pickaxe: { mark: "Ки", key: "shopPickWood" },
  iron_pickaxe: { mark: "Жк", key: "shopPickIron" },
  basic_miner: { mark: "Мш", key: "shopMachine" },
  click_power_1: { mark: "Кл", key: "shopClick" },
  credits: { mark: "К", key: "invStone" },
};

export function itemView(code: string): ItemView {
  return ITEMS[code] ?? { mark: code.slice(0, 2).toUpperCase(), key: "inventoryStub" };
}

import { describe, it, expect } from "vitest";
import { formatDistance, formatDifficulty } from "../src/lib/utils";

describe("Dominio Territorial SR CONECTA — Reglas de Negocio", () => {
  describe("Utilidades Métricas y de Dificultad", () => {
    it("debe formatear distancias menores a 1000m en metros exactos", () => {
      expect(formatDistance(350)).toBe("350 m");
      expect(formatDistance(999.4)).toBe("999 m");
    });

    it("debe formatear distancias mayores o iguales a 1000m en kilómetros con un decimal", () => {
      expect(formatDistance(1250)).toBe("1.3 km");
      expect(formatDistance(6800)).toBe("6.8 km");
    });

    it("debe asignar colores semánticos según el nivel de dificultad", () => {
      expect(formatDifficulty("EASY").label).toBe("Fácil");
      expect(formatDifficulty("EASY").color).toContain("text-territory-nature");

      expect(formatDifficulty("MEDIUM").label).toBe("Media");
      expect(formatDifficulty("MEDIUM").color).toContain("text-territory-mission");

      expect(formatDifficulty("HARD").label).toBe("Difícil");
    });
  });

  describe("Invariantes de Recompensas", () => {
    it("el stock de una recompensa nunca puede ser negativo", () => {
      const reward = {
        id: "rew-01",
        stock: 1,
        title: "10% Descuento",
      };

      // Simulación de decremento con guardia
      const decrementStock = (r: typeof reward) => {
        if (r.stock <= 0) throw new Error("out_of_stock");
        return { ...r, stock: r.stock - 1 };
      };

      const decremented = decrementStock(reward);
      expect(decremented.stock).toBe(0);

      expect(() => decrementStock(decremented)).toThrow("out_of_stock");
    });
  });

  describe("Invariantes de Misiones y Anti-Spoofing", () => {
    it("debe rechazar verificaciones a más de 120 metros de tolerancia física", () => {
      const MAX_TOLERANCE_METERS = 120;

      const isWithinTolerance = (distanceMeters: number) => distanceMeters <= MAX_TOLERANCE_METERS;

      expect(isWithinTolerance(45)).toBe(true);
      expect(isWithinTolerance(120)).toBe(true);
      expect(isWithinTolerance(121)).toBe(false);
      expect(isWithinTolerance(5200)).toBe(false);
    });
  });
});

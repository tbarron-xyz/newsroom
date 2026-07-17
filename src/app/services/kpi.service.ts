import { KpiName } from "../schemas/types";
import { IDataStorageService } from "./data-storage.interface";
import OpenAI from "openai";

export class KpiService {
  private dataStorageService: IDataStorageService;

  constructor(dataStorageService: IDataStorageService) {
    this.dataStorageService = dataStorageService;
  }

  /**
   * Static method to increment KPIs from an OpenAI API response.
   * This is a convenience method that can be called directly without instantiating KpiService.
   */
  static async incrementKpisFromOpenAIResponse(
    response: OpenAI.Chat.Completions.ChatCompletion,
    dataStorageService: IDataStorageService
  ): Promise<void> {
    if (!response.usage) {
      console.warn("No usage data in OpenAI response");
      return;
    }
    const kpiService = new KpiService(dataStorageService);
    await kpiService.incrementKpis({
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens
    });
  }

  async incrementKpis(usage: {
    promptTokens: number;
    completionTokens: number;
  }): Promise<void> {
    try {
      // Increment input tokens
      await this.incrementKpi(
        KpiName.TOTAL_TEXT_INPUT_TOKENS,
        usage.promptTokens
      );

      // Increment output tokens
      await this.incrementKpi(
        KpiName.TOTAL_TEXT_OUTPUT_TOKENS,
        usage.completionTokens
      );
    } catch (error) {
      console.error("Error incrementing KPIs:", error);
      // Don't throw - KPI tracking should not break the main functionality
    }
  }

  private async incrementKpi(
    kpiName: KpiName,
    increment: number
  ): Promise<void> {
    const currentValue = await this.getKpiValue(kpiName);
    const newValue = currentValue + increment;
    await this.setKpiValue(kpiName, newValue);
  }

  async getKpiValue(kpiName: KpiName): Promise<number> {
    try {
      return await this.dataStorageService.getKpiValue(kpiName);
    } catch (error) {
      console.error(`Error getting KPI value for ${kpiName}:`, error);
      return 0;
    }
  }

  private async setKpiValue(kpiName: KpiName, value: number): Promise<void> {
    try {
      await this.dataStorageService.setKpiValue(kpiName, value);
    } catch (error) {
      console.error(`Error setting KPI value for ${kpiName}:`, error);
      throw error;
    }
  }

  async getAllKpis(): Promise<Record<KpiName, number>> {
    const kpis: Partial<Record<KpiName, number>> = {};

    for (const kpiName of Object.values(KpiName)) {
      kpis[kpiName as KpiName] = await this.getKpiValue(kpiName as KpiName);
    }

    return kpis as Record<KpiName, number>;
  }
}

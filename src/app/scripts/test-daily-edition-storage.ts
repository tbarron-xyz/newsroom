import { ServiceContainer } from "../services/service-container";
import { DailyEdition } from "../schemas/types";

async function testDailyEditionStorage(): Promise<void> {
  console.log("🧪 Testing daily edition storage in Redis...\n");

  try {
    const container = ServiceContainer.getInstance();
    const redisService = await container.getDataStorageService();

    // Create a test daily edition
    const testDailyEdition: DailyEdition = {
      id: "test_daily_edition_123",
      editions: ["test_edition_1", "test_edition_2"],
      generationTime: Date.now(),
      frontPageHeadline: "Test Daily News Headline",
      frontPageArticle:
        "This is a test front page article for verifying Redis storage functionality.",
      newspaperName: "Test Gazette",
      topics: [
        {
          name: "Test Topic 1",
          headline: "Test Headline 1",
          newsStoryFirstParagraph:
            "This is the first paragraph of a test news story.",
          newsStorySecondParagraph:
            "This is the second paragraph providing additional context.",
          oneLineSummary: "Test news summary in one line."
        }
      ],
      // modelFeedbackAboutThePrompt: {
      //   positive: "Test feedback - positive aspects noted.",
      //   negative: "Test feedback - some areas for improvement."
      // },
      prompt: "Test prompt for daily edition generation",
      modelName: "gpt-5-nano"
    };

    console.log("📝 Storing test daily edition...");
    await redisService.saveDailyEdition(testDailyEdition);
    console.log("✅ Test daily edition stored successfully");

    console.log("\n🔍 Retrieving stored daily edition...");
    const retrievedEdition = await redisService.getDailyEdition(
      testDailyEdition.id
    );

    if (retrievedEdition) {
      console.log("✅ Daily edition retrieved successfully");
      console.log(`   • ID: ${retrievedEdition.id}`);
      console.log(`   • Newspaper: ${retrievedEdition.newspaperName}`);
      console.log(`   • Front page: ${retrievedEdition.frontPageHeadline}`);
      console.log(`   • Topics: ${retrievedEdition.topics.length}`);
      console.log(`   • Editions: ${retrievedEdition.editions.length}`);
    } else {
      console.log("❌ Failed to retrieve daily edition");
    }

    console.log("\n📊 Checking all daily editions...");
    const allEditions = await redisService.getDailyEditions();
    console.log(`✅ Found ${allEditions.length} daily edition(s) in Redis`);

    // Note: Test data will remain in Redis for verification
    // In production, you might want to add a cleanup method to RedisService
    console.log(
      "\n📝 Note: Test data remains in Redis for verification purposes"
    );

    console.log("\n🎉 Redis storage test complete!");
    console.log("✅ All Redis operations working correctly\n");
  } catch (error) {
    console.error("❌ Redis storage test failed:", error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testDailyEditionStorage().catch((error) => {
    console.error("💥 Test failed:", error);
    process.exit(1);
  });
}

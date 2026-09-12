import { db } from "../db";
import { sql } from "drizzle-orm";

async function updateScheduleSchema() {
  try {
    console.log("Adding new columns to schedules table...");

    await db.execute(sql`
      ALTER TABLE schedules 
      ADD COLUMN IF NOT EXISTS is_special_schedule BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS special_dates JSONB,
      ADD COLUMN IF NOT EXISTS special_instructions TEXT,
      ADD COLUMN IF NOT EXISTS is_full BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS fare_type TEXT DEFAULT 'standard',
      ADD COLUMN IF NOT EXISTS discounted_price NUMERIC,
      ADD COLUMN IF NOT EXISTS has_promotion BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS promotion_description TEXT,
      ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
      ADD COLUMN IF NOT EXISTS ferry_id INTEGER,
      ADD COLUMN IF NOT EXISTS crew_details JSONB,
      ADD COLUMN IF NOT EXISTS weather_condition TEXT,
      ADD COLUMN IF NOT EXISTS checkin_location TEXT,
      ADD COLUMN IF NOT EXISTS boarding_location TEXT,
      ADD COLUMN IF NOT EXISTS bag_allowance JSONB,
      ADD COLUMN IF NOT EXISTS amenities JSONB;
    `);

    console.log("Successfully added new columns to schedules table");
  } catch (error) {
    console.error("Error updating schedule schema:", error);
  }
}

// Run the function
updateScheduleSchema()
  .then(() => console.log("Schema update complete"))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });

export default updateScheduleSchema;
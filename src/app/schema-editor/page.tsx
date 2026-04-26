"use client";

import { useState, useEffect, useMemo } from "react";
import { z } from "zod";

export default function SchemaEditorPage() {
  const [schemaCode, setSchemaCode] =
    useState(`// JSON-safe example only (use string/number/boolean/null/array/object)
const schema = z.object({
  name: z.string(),
  count: z.number(),
  active: z.boolean(),
  nullable: z.null(),
  list: z.array(z.string())
});
schema;`);

  const [error, setError] = useState<string | null>(null);

  // Generate sample data based on schema
  const sampleJson = useMemo(() => {
    try {
      // Create a function that uses the user's code and z import
      const createSchema = new Function("z", schemaCode + "; return schema;");
      const schema = createSchema(z);
      const sample = generateSample(schema);
      setError(null);
      return sample;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid schema");
      return null;
    }
  }, [schemaCode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600 py-8 px-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-600/20 via-gray-500/20 to-gray-400/20 animate-pulse duration-3000"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-gray-400/30 to-gray-500/30 rounded-full blur-3xl duration-3000"></div>
      <div
        className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-gray-500/30 to-gray-400/30 rounded-full blur-3xl duration-3000"
        style={{ animationDelay: "1s" }}
      ></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 mb-8 shadow-2xl">
          <h1 className="text-4xl font-bold text-white/90 mb-2">
            Zod Schema Editor
          </h1>
          <p className="text-white/70 text-lg">
            Create and test Zod schemas with live JSON example generation
          </p>
        </div>

        {/* Main Content - Two Pane Layout */}
        <div className="flex flex-col lg:flex-row gap-8 min-h-[600px]">
          {/* Left Pane - Zod Schema Editor */}
          <div className="flex-1 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white/80"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-white/90">
                  Zod Schema
                </h2>
              </div>

              <textarea
                value={schemaCode}
                onChange={(e) => setSchemaCode(e.target.value)}
                className={`w-full h-[500px] p-4 bg-white border border-gray-300 rounded-lg resize-none font-mono text-sm text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:border-gray-600 ${
                  error
                    ? "border-red-500"
                    : "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                }`}
                placeholder="Write your Zod schema here..."
                spellCheck={false}
              />

              {error && (
                <div className="text-red-300 text-sm bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                  <div className="font-semibold">Schema Error:</div>
                  <div className="mt-1">{error}</div>
                </div>
              )}
            </div>
          </div>

          {/* Right Pane - JSON Example */}
          <div className="flex-1 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white/80"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-white/90">
                  Example JSON
                </h2>
              </div>

              {sampleJson ? (
                <pre className="w-full h-[500px] p-4 bg-black/20 border border-white/10 rounded-lg overflow-auto font-mono text-sm text-white/90 whitespace-pre-wrap">
                  {JSON.stringify(sampleJson, null, 2)}
                </pre>
              ) : (
                <div className="w-full h-[500px] p-4 bg-black/20 border border-white/10 rounded-lg flex items-center justify-center text-white/70">
                  Fix the schema above to see JSON example
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// JSON-safe sample generator for Zod schemas
const JSON_TYPES = [
  "ZodString",
  "ZodNumber",
  "ZodBoolean",
  "ZodNull",
  "ZodArray",
  "ZodObject"
] as const;

function generateSample(schema: z.ZodTypeAny): any {
  if (!(schema instanceof Object) || !schema._def) {
    throw new Error("Invalid Zod schema");
  }

  const def = schema._def;
  const typeName = def.typeName;

  if (!JSON_TYPES.includes(typeName as any)) {
    throw new Error(
      `Non-JSON type not supported: ${typeName}. Use string/number/boolean/null/array/object only.`
    );
  }

  switch (typeName) {
    case "ZodString":
      return "Hello World";

    case "ZodNumber":
      return 42;

    case "ZodBoolean":
      return true;

    case "ZodNull":
      return null;

    case "ZodArray":
      const elementSchema = def.type;
      return [generateSample(elementSchema)];

    case "ZodObject":
      const obj: any = {};
      for (const [key, valueSchema] of Object.entries(
        (schema as z.ZodObject<any>).shape
      ) as [string, z.ZodTypeAny][]) {
        obj[key] = generateSample(valueSchema);
      }
      return obj;

    case "ZodOptional":
      return generateSample(def.innerType);

    case "ZodNullable":
      return null;

    case "ZodUnion":
      // Pick first option for simplicity
      if (def.options && def.options.length > 0) {
        return generateSample(def.options[0]);
      }
      return "union_example";

    case "ZodLiteral":
      return def.value;

    case "ZodEnum":
      if (def.values && def.values.length > 0) {
        return def.values[0];
      }
      return "enum_value";

    default:
      // Fallback for unknown types
      return `sample_${typeName.toLowerCase()}`;
  }
}

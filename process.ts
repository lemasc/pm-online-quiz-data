import fs from "fs/promises";
import path from "path";

interface BaseExamModel {
  name: string;
  time?: number;
  allowRandom: boolean;
  content?: string;
  items?: Record<string, unknown>;
  level: string;
  subject: string;
}

type ExamModel = Partial<BaseExamModel> & {
  id: string;
};

function sortByName<T extends ExamModel>(input: T[]): T[] {
  return input.sort((a, b) =>
    (a.name as string) > (b.name as string) ? -1 : 1
  );
}

async function main() {
  const root = process.cwd();
  const dir = (
    await fs.readdir(root, {
      withFileTypes: true,
    })
  ).filter(
    (c) => c.isDirectory() && c.name !== "node_modules" && c.name !== ".git"
  );
  console.log(`Founded ${dir.length} folders`);
  const rootIndex = (
    await Promise.all(
      dir.map<Promise<ExamModel | undefined>>(async (folder) => {
        try {
          console.log(`--> Processing folder: ${folder.name} `);
          const index = JSON.parse(
            await fs.readFile(path.join(root, folder.name, "index.json"), {
              encoding: "utf-8",
            })
          ) as ExamModel;
          if (index.name) {
            console.log;
            delete index.name;
            await fs.writeFile(
              path.join(root, folder.name, "index.json"),
              JSON.stringify(index)
            );
          }
          return {
            subject: index.subject,
            level: index.level,
            time: index.time,
            id: folder.name,
          };
        } catch (err) {
          console.error(err);
          console.log(`--> Error while processing ${folder.name}. Skipping.`);
        }
      })
    )
  ).filter((v) => v !== undefined) as ExamModel[];
  console.log(`Processed ${rootIndex.length} folders.`);
  console.log("Reordering....");

  const SECONDARY = rootIndex.filter((c) => c.level === "SECONDARY");
  const UPPER_SECONDARY = rootIndex.filter(
    (c) => c.level === "UPPER_SECONDARY"
  );
  await fs.writeFile(
    "index.json",
    JSON.stringify([...sortByName(SECONDARY), ...sortByName(UPPER_SECONDARY)])
  );
}

main().catch(console.error);

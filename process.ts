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

type ExamModel = BaseExamModel & {
  id: string;
  canShowName?: boolean;
};

function sortByName<T extends Partial<ExamModel>>(input: T[]): T[] {
  return input.sort((a, b) =>
    (a.name as string) > (b.name as string) ? -1 : 1
  );
}

type RecursiveData = {
  count: number;
  names: string[];
};

async function readRecursive(dir: string, level: number) {
  const indexFile = JSON.parse(
    await fs.readFile(path.join(dir, "index.json"), {
      encoding: "utf-8",
    })
  ) as ExamModel;
  const data: RecursiveData = { count: 0, names: [] };
  if (level === 1 && indexFile.items?.length !== 0) {
    data.names.push(indexFile.name);
  }
  if (level !== 0) {
    console.log(
      `${Array(level + 1)
        .fill("====")
        .join("")}> (${level}) Show ${
        indexFile.canShowName ? "TRUE" : "FALSE"
      } | Random ${indexFile.allowRandom ? "TRUE" : "FALSE"} Section ${
        indexFile.name
      }`
    );
  }
  if (indexFile.items) {
    data.count = data.count + Object.keys(indexFile.items).length;
  }
  const folders = JSON.parse(
    await fs.readFile(path.join(dir, "sections.json"), {
      encoding: "utf-8",
    })
  ) as string[];

  for (let sub of folders) {
    const result = await readRecursive(path.join(dir, sub), level + 1);
    data.count = data.count + result.count;
    data.names = [...data.names, ...result.names];
  }
  return data;
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
  const rootIndex: Partial<ExamModel>[] = [];

  for (let folder of dir) {
    try {
      console.log(`--> Processing folder: ${folder.name} `);
      const index = JSON.parse(
        await fs.readFile(path.join(root, folder.name, "index.json"), {
          encoding: "utf-8",
        })
      ) as ExamModel;
      if (index.name) {
        delete (index as Partial<ExamModel>).name;
        await fs.writeFile(
          path.join(root, folder.name, "index.json"),
          JSON.stringify(index)
        );
      }
      rootIndex.push({
        subject: index.subject,
        level: index.level,
        time: index.time,
        id: folder.name,
        ...(await readRecursive(path.join(root, folder.name), 0)),
      });
    } catch (err) {
      console.error(err);
      console.log(`--> Error while processing ${folder.name}. Skipping.`);
    }
    console.log("\n");
  }
  console.log(`Processed ${rootIndex.length} folders.`);

  await fs.writeFile("index.json", JSON.stringify(sortByName(rootIndex)));
}

main().catch(console.error);

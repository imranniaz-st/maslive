import { db, toolsTable } from "@workspace/db";

type BuiltinTool = {
  name: string;
  description: string;
  category: string;
  command: string;
  defaultArgs: string;
};

function configuredTools(): BuiltinTool[] {
  return [
    {
      name: "Nmap",
      description: "Network mapper configured from NMAP_PATH.",
      category: "scanner",
      command: process.env.NMAP_PATH ?? "nmap",
      defaultArgs: "-sV",
    },
    {
      name: "Nikto",
      description: "Web server scanner configured from NIKTO_PATH.",
      category: "web",
      command: process.env.NIKTO_PATH ?? "nikto",
      defaultArgs: "-h",
    },
    {
      name: "Metasploit Console",
      description: "Metasploit console executable configured from MSFCONSOLE_PATH.",
      category: "console",
      command: process.env.MSFCONSOLE_PATH ?? "msfconsole",
      defaultArgs: "-q",
    },
  ];
}

export async function syncBuiltinTools() {
  for (const tool of configuredTools()) {
    await db
      .insert(toolsTable)
      .values({ ...tool, isBuiltin: true })
      .onConflictDoUpdate({
        target: toolsTable.name,
        set: {
          description: tool.description,
          category: tool.category,
          command: tool.command,
          defaultArgs: tool.defaultArgs,
          isBuiltin: true,
        },
      });
  }
}

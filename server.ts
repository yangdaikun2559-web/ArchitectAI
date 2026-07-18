import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import crypto from "crypto";
import { DEFAULT_MCUS, DEFAULT_COMPONENTS } from "./src/data/defaultHardware";
import { stm32ScaffoldFiles } from "./src/data/stm32Scaffold";
import { validateProjectHardware } from "./src/lib/hardwareLinter";
import { syncCodeFromConnections } from "./src/lib/codeSync";
import { RagEngine } from "./src/lib/ragEngine";
import { allocatePins } from "./src/lib/pinAllocator";
import { findMissingRequiredComponents, mergeRagAndResolvedComponents, resolveComponentsFromFullCatalog } from "./src/lib/componentResolver";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProductionServer =
  process.env.NODE_ENV === "production" ||
  !!process.env.PORT ||
  process.argv.some(arg => arg.includes("dist/server"));

// Setup JSON body parsing with large limit for extensive code / diagrams
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Error handling middleware for invalid JSON payloads
app.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof SyntaxError && "status" in err && err.status === 400 && "body" in err) {
    console.error("Malformed JSON received:", err.message);
    res.status(400).json({ error: "Invalid JSON format" });
    return;
  }
  next(err);
});

// Check on start if GEMINI_API_KEY exists
const apiKey = process.env.GEMINI_API_KEY;
const hasValidGeminiKey = !!(apiKey && apiKey !== "PLACEHOLDER_KEY" && apiKey !== "dummy_key_if_unspecified");
if (!hasValidGeminiKey) {
  console.warn("WARNING: GEMINI_API_KEY is not defined or is a placeholder in environment variables. Gemini features will fallback to DeepSeek.");
}

// Instantiate GoogleGenAI strictly using server-side config and named parameter
const ai = new GoogleGenAI({
  apiKey: hasValidGeminiKey ? apiKey : "dummy_key_if_unspecified",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const ragEngine = new RagEngine(ai, hasValidGeminiKey);

// Start background RAG warmup asynchronously
fetchComponentsFromDb().then(comps => {
  ragEngine.warmup(comps).catch(err => {
    console.error("[RAG Engine] Warmup error on boot:", err);
  });
}).catch(err => {
  console.error("Failed to read components for RAG warmup:", err);
});

// Setup local JSON file-based database
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readDbFile<T>(fileName: string, defaultData: T): T {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), "utf-8");
    return defaultData;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading database file ${fileName}:`, err);
    return defaultData;
  }
}

function writeDbFile<T>(fileName: string, data: T): void {
  const filePath = path.join(DATA_DIR, fileName);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`Error writing database file ${fileName}:`, err);
  }
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

interface LocalUser {
  userId: string;
  username: string;
  email: string;
  displayName: string;
  passwordHash: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

type LearningTaskType =
  | 'requirement'
  | 'components'
  | 'interfaces'
  | 'wiring'
  | 'safety'
  | 'code'
  | 'export'
  | 'reflection';

const LEARNING_TASK_ORDER: LearningTaskType[] = [
  "requirement",
  "components",
  "interfaces",
  "wiring",
  "safety",
  "code",
  "export",
  "reflection",
];

interface LearningQuestion {
  type: 'choice' | 'judge' | 'short';
  prompt: string;
  options?: string[];
  answer?: string;
  explanation?: string;
}

interface LearningPortrait {
  scope: 'student' | 'class';
  title: string;
  summary: string;
  tags: string[];
  strengths: string[];
  risks: string[];
  suggestions: string[];
  dimensions?: Array<{
    name: string;
    level: 'strong' | 'stable' | 'developing' | 'risk';
    score?: number;
    evidence: string;
    suggestion: string;
  }>;
  focusItems?: string[];
  teachingFocus?: Array<{
    title: string;
    reason: string;
    action: string;
  }>;
  updatedAt: string;
  coverage: {
    submissions: number;
    completedTasks: number;
    averageAiScore?: number;
  };
}

interface ClassRoom {
  classId: string;
  name: string;
  teacherId: string;
  joinCode?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface ClassMember {
  classId: string;
  userId: string;
  role: 'student';
  joinedAt: string;
}

interface ClassJoinRequest {
  requestId: string;
  classId: string;
  studentId: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface LearningSubmission {
  submissionId: string;
  classId: string;
  studentId: string;
  projectId?: string;
  projectName?: string;
  taskType: LearningTaskType;
  title: string;
  content: string;
  attachments?: string;
  aiFeedback?: string;
  aiScore?: number;
  aiRubric?: string;
  aiSuggestions?: string;
  aiStatus?: 'pending' | 'completed' | 'failed';
  aiEvaluatedAt?: string;
  aiObjectiveCorrect?: number;
  aiObjectiveTotal?: number;
  aiEvidenceScope?: {
    submissions: number;
    completedTasks: number;
    missingTasks: LearningTaskType[];
    isComplete: boolean;
  };
  teacherFeedback?: string;
  score?: number;
  status: 'submitted' | 'reviewed';
  createdAt: string;
  updatedAt: string;
  studentName?: string;
  className?: string;
}

async function fetchMcusFromDb() {
  return readDbFile<any[]>("mcus.json", DEFAULT_MCUS);
}

async function fetchComponentsFromDb() {
  const partsDir = path.join(process.cwd(), "parts");
  if (!fs.existsSync(partsDir)) {
    fs.mkdirSync(partsDir, { recursive: true });
  }
  try {
    const files = fs.readdirSync(partsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    if (jsonFiles.length === 0) {
      // Fallback/Seed from DEFAULT_COMPONENTS
      for (const comp of DEFAULT_COMPONENTS) {
        fs.writeFileSync(path.join(partsDir, `${comp.id}.json`), JSON.stringify(comp, null, 2), "utf-8");
      }
      return DEFAULT_COMPONENTS;
    }
    const components: any[] = [];
    for (const file of jsonFiles) {
      const raw = fs.readFileSync(path.join(partsDir, file), "utf-8");
      components.push(JSON.parse(raw));
    }
    return components;
  } catch (err) {
    console.error("Error reading parts directory:", err);
    return readDbFile<any[]>("components.json", DEFAULT_COMPONENTS);
  }
}

interface FileEntry {
  path: string;
  content: string;
  language: string;
}

function getTemplateFilesRecursively(dir: string, baseDir: string = dir): FileEntry[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: FileEntry[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.toLowerCase() === 'listings' || entry.name.toLowerCase() === 'objects') {
        continue;
      }
      files.push(...getTemplateFilesRecursively(fullPath, baseDir));
    } else {
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      const ext = path.extname(entry.name).toLowerCase();
      if (ext === '.uvoptx' || ext === '.uvguix' || ext === '.bak' || ext === '.dep') {
        continue;
      }
      const content = fs.readFileSync(fullPath, 'utf8');
      let language = 'text';
      if (ext === '.c') language = 'c';
      else if (ext === '.h') language = 'header';
      else if (ext === '.s') language = 'asm';
      else if (ext === '.uvprojx') language = 'xml';
      else if (ext === '.md') language = 'markdown';
      else if (ext === '.ini') language = 'ini';

      files.push({
        path: relativePath,
        content,
        language
      });
    }
  }
  return files;
}

function updateKeilProjectUserFiles(xmlContent: string, files: FileEntry[]): string {
  const userFiles = files.filter(f => f.path.startsWith('user/'));
  const fileNodes = userFiles.map(f => {
    const fileName = path.basename(f.path);
    const ext = path.extname(f.path).toLowerCase();
    let fileType = 5;
    if (ext === '.c') fileType = 1;
    else if (ext === '.s') fileType = 2;
    const winPath = f.path.replace(/\//g, '\\');
    return `            <File>
              <FileName>${fileName}</FileName>
              <FileType>${fileType}</FileType>
              <FilePath>.\\${winPath}</FilePath>
            </File>`;
  }).join('\n');

  const userGroupRegex = /(<GroupName>user<\/GroupName>\s*<Files>)[\s\S]*?(<\/Files>)/;
  if (userGroupRegex.test(xmlContent)) {
    return xmlContent.replace(userGroupRegex, `$1\n${fileNodes}\n$2`);
  }
  return xmlContent;
}

function generateKeilProjectXml(files: FileEntry[]): string {
  // Filter for C source files (typically in src/ directory)
  const cFiles = files.filter(f => f.path.endsWith('.c'));

  const fileNodes = cFiles.map(f => {
    // Extract filename e.g. main.c from src/main.c
    const name = f.path.split('/').pop() || f.path;
    // We convert path separator / to \ for Windows compatibility
    const winPath = f.path.replace(/\//g, '\\');
    return `
            <File>
              <FileName>${name}</FileName>
              <FileType>1</FileType>
              <FilePath>.\\${winPath}</FilePath>
            </File>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<Project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="project_projx.xsd">

  <SchemaVersion>2.1</SchemaVersion>

  <Header>### uVision Project, (C) Keil Software</Header>

  <Targets>
    <Target>
      <TargetName>Target 1</TargetName>
      <Device>STM32F103C8</Device>
      <Vendor>STMicroelectronics</Vendor>
      <PackID>Keil.STM32F1xx_DFP.2.4.0</PackID>
      <PackName>STM32F1xx Family Device Support and Examples</PackName>
      <Cpu>IRAM(0x20000000,0x5000) IROM(0x08000000,0x10000) CPUTYPE("Cortex-M3") CLOCK(12000000) ELITTLE</Cpu>
      <FlashUtilSpec></FlashUtilSpec>
      <StartupFile></StartupFile>
      <FlashDriverDll>UL2CM3(-S0 -C0 -P0 -FD20000000 -FC1000 -FN1 -FF0STM32F10x_128 -FS08000000 -FL020000 -FP0($$Device:STM32F103C8$Flash\\STM32F10x_128.FLM))</FlashDriverDll>
      <DeviceId>4235</DeviceId>
      <RegisterFile>$$Device:STM32F103C8$Device\\Include\\stm32f10x.h</RegisterFile>
      <MemoryEnv></MemoryEnv>
      <Cmp></Cmp>
      <Asm></Asm>
      <Linker></Linker>
      <OHString></OHString>
      <InfinionOptionDll></InfinionOptionDll>
      <SLE66CMisc></SLE66CMisc>
      <SLE66AMisc></SLE66AMisc>
      <SLE66LinkerMisc></SLE66LinkerMisc>
      <SFDFile>$$Device:STM32F103C8$SVD\\STM32F103xx.svd</SFDFile>
      <bCustSvd>0</bCustSvd>
      <UseEnv>0</UseEnv>
      <BinPath></BinPath>
      <IncludePath></IncludePath>
      <LibPath></LibPath>
      <RegisterFilePath></RegisterFilePath>
      <DBRegisterFilePath></DBRegisterFilePath>
      <TargetOption>
        <TargetCommonOption>
          <Device>STM32F103C8</Device>
          <Vendor>STMicroelectronics</Vendor>
          <Cpu>IRAM(0x20000000,0x5000) IROM(0x08000000,0x10000) CPUTYPE("Cortex-M3") CLOCK(12000000) ELITTLE</Cpu>
          <FlashUtilSpec></FlashUtilSpec>
          <StartupFile></StartupFile>
          <FlashDriverDll>UL2CM3(-S0 -C0 -P0 -FD20000000 -FC1000 -FN1 -FF0STM32F10x_128 -FS08000000 -FL020000 -FP0($$Device:STM32F103C8$Flash\\STM32F10x_128.FLM))</FlashDriverDll>
          <DeviceId>4235</DeviceId>
          <RegisterFile>$$Device:STM32F103C8$Device\\Include\\stm32f10x.h</RegisterFile>
          <MemoryEnv></MemoryEnv>
          <Cmp></Cmp>
          <Asm></Asm>
          <Linker></Linker>
          <OHString></OHString>
          <InfinionOptionDll></InfinionOptionDll>
          <SLE66CMisc></SLE66CMisc>
          <SLE66AMisc></SLE66AMisc>
          <SLE66LinkerMisc></SLE66LinkerMisc>
          <SFDFile>$$Device:STM32F103C8$SVD\\STM32F103xx.svd</SFDFile>
          <bCustSvd>0</bCustSvd>
          <UseEnv>0</UseEnv>
          <BinPath></BinPath>
          <IncludePath></IncludePath>
          <LibPath></LibPath>
          <RegisterFilePath></RegisterFilePath>
          <DBRegisterFilePath></DBRegisterFilePath>
          <TargetStatus>
            <Error>0</Error>
            <ExitCodeStop>0</ExitCodeStop>
            <ButtonStop>0</ButtonStop>
            <NotGenerated>0</NotGenerated>
            <InvalidFlash>1</InvalidFlash>
          </TargetStatus>
          <OutputDirectory>.\\Objects\\</OutputDirectory>
          <OutputName>project</OutputName>
          <CreateExecutable>1</CreateExecutable>
          <CreateLib>0</CreateLib>
          <CreateHexFile>1</CreateHexFile>
          <DebugInformation>1</DebugInformation>
          <BrowseInformation>1</BrowseInformation>
          <ListingPath>.\\Listings\\</ListingPath>
          <HexFormatSelection>1</HexFormatSelection>
          <Merge32K>0</Merge32K>
          <CreateBatchFile>0</CreateBatchFile>
          <BeforeCompile>
            <RunUserProg1>0</RunUserProg1>
            <RunUserProg2>0</RunUserProg2>
            <UserProg1Name></UserProg1Name>
            <UserProg2Name></UserProg2Name>
            <UserProg1Dos16Mode>0</UserProg1Dos16Mode>
            <UserProg2Dos16Mode>0</UserProg2Dos16Mode>
            <nStopU1X>0</nStopU1X>
            <nStopU2X>0</nStopU2X>
          </BeforeCompile>
          <BeforeMake>
            <RunUserProg1>0</RunUserProg1>
            <RunUserProg2>0</RunUserProg2>
            <UserProg1Name></UserProg1Name>
            <UserProg2Name></UserProg2Name>
            <UserProg1Dos16Mode>0</UserProg1Dos16Mode>
            <UserProg2Dos16Mode>0</UserProg2Dos16Mode>
            <nStopB1X>0</nStopB1X>
            <nStopB2X>0</nStopB2X>
          </BeforeMake>
          <AfterMake>
            <RunUserProg1>0</RunUserProg1>
            <RunUserProg2>0</RunUserProg2>
            <UserProg1Name></UserProg1Name>
            <UserProg2Name></UserProg2Name>
            <UserProg1Dos16Mode>0</UserProg1Dos16Mode>
            <UserProg2Dos16Mode>0</UserProg2Dos16Mode>
            <nStopA1X>0</nStopA1X>
            <nStopA2X>0</nStopA2X>
          </AfterMake>
          <SelectedForBatchBuild>0</SelectedForBatchBuild>
          <SVCSIdString></SVCSIdString>
        </TargetCommonOption>
        <CommonProperty>
          <UseCPPCompiler>0</UseCPPCompiler>
          <RVCTCodeConst>0</RVCTCodeConst>
          <RVCTZI>0</RVCTZI>
          <RVCTOtherData>0</RVCTOtherData>
          <ModuleSelection>0</ModuleSelection>
          <IncludeInBuild>1</IncludeInBuild>
          <AlwaysBuild>0</AlwaysBuild>
          <GenerateAssemblyFile>0</GenerateAssemblyFile>
          <AssembleAssemblyFile>0</AssembleAssemblyFile>
          <PublicsOnly>0</PublicsOnly>
          <StopOnExitCode>3</StopOnExitCode>
          <CustomArgument></CustomArgument>
          <IncludeLibraryModules></IncludeLibraryModules>
          <ComprImg>1</ComprImg>
        </CommonProperty>
        <DllOption>
          <SimDllName>SARMCM3.DLL</SimDllName>
          <SimDllArguments></SimDllArguments>
          <SimDlgDll>DARMSTM.DLL</SimDlgDll>
          <SimDlgDllArguments>-pSTM32F103C8</SimDlgDllArguments>
          <TargetDllName>SARMCM3.DLL</TargetDllName>
          <TargetDllArguments></TargetDllArguments>
          <TargetDlgDll>TARMSTM.DLL</TargetDlgDll>
          <TargetDlgDllArguments>-pSTM32F103C8</TargetDlgDllArguments>
        </DllOption>
        <DebugOption>
          <OPTHX>
            <HexSelection>1</HexSelection>
            <HexRangeLowAddress>0</HexRangeLowAddress>
            <HexRangeHighAddress>0</HexRangeHighAddress>
            <HexOffset>0</HexOffset>
            <Oh166RecLen>16</Oh166RecLen>
          </OPTHX>
        </DebugOption>
        <Utilities>
          <Flash1>
            <UseTargetDll>1</UseTargetDll>
            <UseExternalTool>0</UseExternalTool>
            <RunIndependent>0</RunIndependent>
            <UpdateFlashBeforeDebugging>1</UpdateFlashBeforeDebugging>
            <Capability>1</Capability>
            <DriverSelection>4096</DriverSelection>
          </Flash1>
          <bUseTDR>1</bUseTDR>
          <Flash2>BIN\\UL2CM3.DLL</Flash2>
          <Flash3>"" ()</Flash3>
          <Flash4></Flash4>
          <pFcarmOut></pFcarmOut>
          <pFcarmGrp></pFcarmGrp>
          <pFcArmRoot></pFcArmRoot>
          <FcArmLst>0</FcArmLst>
        </Utilities>
        <TargetOption>
          <TargetArmAds>
            <ArmAdsMisc>
              <GenerateListings>0</GenerateListings>
              <asHll>1</asHll>
              <asAsm>1</asAsm>
              <asMacX>1</asMacX>
              <asSyms>1</asSyms>
              <asFals>1</asFals>
              <asDbgD>1</asDbgD>
              <asForm>1</asForm>
              <ldLst>0</ldLst>
              <ldmm>1</ldmm>
              <ldXref>1</ldXref>
              <BigEnd>0</BigEnd>
              <AdsALst>1</AdsALst>
              <AdsACrf>1</AdsACrf>
              <AdsANop>0</AdsANop>
              <AdsADbg>1</AdsADbg>
              <AdsALec>1</AdsALec>
              <AdsAL5r>1</AdsAL5r>
              <AdsAEOpt>1</AdsAEOpt>
              <AdsAJop>0</AdsAJop>
              <AdsABsg>0</AdsABsg>
              <AdsADao>0</AdsADao>
              <AdsCPrg>0</AdsCPrg>
              <AdsCOpt>3</AdsCOpt>
              <AdsColMap>1</AdsColMap>
              <AdsCpuType>"Cortex-M3"</AdsCpuType>
              <RvctClst>0</RvctClst>
              <GenPPlst>0</GenPPlst>
              <AdsCpuType></AdsCpuType>
              <RvctDeviceName></RvctDeviceName>
              <mOS>0</mOS>
              <uocRom>0</uocRom>
              <uocRam>0</uocRam>
              <hadIROM>1</hadIROM>
              <hadIRAM>1</hadIRAM>
              <hadXRAM>0</hadXRAM>
              <uocDcg>0</uocDcg>
              <uocMp>0</uocMp>
              <hadIRAM2>0</hadIRAM2>
              <hadIROM2>0</hadIROM2>
              <OnChipMemories>
                <Ocm1>
                  <Type>0</Type>
                  <StartAddress>0x0</StartAddress>
                  <Size>0x0</Size>
                </Ocm1>
                <Ocm2>
                  <Type>0</Type>
                  <StartAddress>0x0</StartAddress>
                  <Size>0x0</Size>
                </Ocm2>
                <Ocm3>
                  <Type>0</Type>
                  <StartAddress>0x0</StartAddress>
                  <Size>0x0</Size>
                </Ocm3>
                <Ocm4>
                  <Type>0</Type>
                  <StartAddress>0x0</StartAddress>
                  <Size>0x0</Size>
                </Ocm4>
                <Ocm5>
                  <Type>0</Type>
                  <StartAddress>0x0</StartAddress>
                  <Size>0x0</Size>
                </Ocm5>
                <Ocm6>
                  <Type>0</Type>
                  <StartAddress>0x0</StartAddress>
                  <Size>0x0</Size>
                </Ocm6>
                <IRAM>
                  <Type>0</Type>
                  <StartAddress>0x20000000</StartAddress>
                  <Size>0x5000</Size>
                </IRAM>
                <IROM>
                  <Type>1</Type>
                  <StartAddress>0x8000000</StartAddress>
                  <Size>0x10000</Size>
                </IROM>
                <XRAM>
                  <Type>0</Type>
                  <StartAddress>0x0</StartAddress>
                  <Size>0x0</Size>
                </XRAM>
                <OCR_RVCT1>
                  <Type>1</Type>
                  <StartAddress>0x0</StartAddress>
                  <Size>0x0</Size>
                </OCR_RVCT1>
                <OCR_RVCT2>
                  <Type>1</Type>
                  <StartAddress>0x0</StartAddress>
                  <Size>0x0</Size>
                </OCR_RVCT2>
                <OCR_RVCT3>
                  <Type>1</Type>
                  <StartAddress>0x0</StartAddress>
                  <Size>0x0</Size>
                </OCR_RVCT3>
                <OCR_RVCT4>
                  <Type>1</Type>
                  <StartAddress>0x8000000</StartAddress>
                  <Size>0x10000</Size>
                </OCR_RVCT4>
                <OCR_RVCT5>
                  <Type>1</Type>
                  <StartAddress>0x0</StartAddress>
                  <Size>0x0</Size>
                </OCR_RVCT5>
                <OCR_RVCT6>
                  <Type>0</Type>
                  <StartAddress>0x0</StartAddress>
                  <Size>0x0</Size>
                </OCR_RVCT6>
                <OCR_RVCT7>
                  <Type>0</Type>
                  <StartAddress>0x0</StartAddress>
                  <Size>0x0</Size>
                </OCR_RVCT7>
                <OCR_RVCT8>
                  <Type>0</Type>
                  <StartAddress>0x0</StartAddress>
                  <Size>0x0</Size>
                </OCR_RVCT8>
                <OCR_RVCT9>
                  <Type>0</Type>
                  <StartAddress>0x20000000</StartAddress>
                  <Size>0x5000</Size>
                </OCR_RVCT9>
                <OCR_RVCT10>
                  <Type>0</Type>
                  <StartAddress>0x0</StartAddress>
                  <Size>0x0</Size>
                </OCR_RVCT10>
              </OnChipMemories>
              <RVCTCodeConst>0</RVCTCodeConst>
              <RVCTZI>0</RVCTZI>
              <RVCTOtherData>0</RVCTOtherData>
              <ModuleSelection>0</ModuleSelection>
              <IncludeInBuild>1</IncludeInBuild>
              <AlwaysBuild>0</AlwaysBuild>
              <GenerateAssemblyFile>0</GenerateAssemblyFile>
              <AssembleAssemblyFile>0</AssembleAssemblyFile>
              <PublicsOnly>0</PublicsOnly>
              <StopOnExitCode>3</StopOnExitCode>
              <CustomArgument></CustomArgument>
              <IncludeLibraryModules></IncludeLibraryModules>
              <ComprImg>1</ComprImg>
            </ArmAdsMisc>
            <Cads>
              <Define>USE_STDPERIPH_DRIVER,STM32F10X_MD</Define>
              <Undefine></Undefine>
              <IncludePath>.;.\\include;.\\src</IncludePath>
            </Cads>
          </TargetOption>
          <Groups>
            <Group>
              <GroupName>Source</GroupName>
              <Files>${fileNodes}
              </Files>
            </Group>
          </Groups>
        </TargetOption>
      </TargetOption>
    </Target>
  </Targets>

  <RTE>
    <apis/>
    <components>
      <component Cclass="Device" Cgroup="Startup" Cvendor="Keil" Cversion="3.5.0" condition="STM32F1xx CMSIS">
        <package name="STM32F1xx_DFP" schemaVersion="1.2" url="http://www.keil.com/pack/" vendor="Keil" version="2.4.0"/>
        <targetInfos>
          <targetInfo name="Target 1"/>
        </targetInfos>
      </component>
      <component Cclass="Device" Cgroup="StdPeriph Drivers" Csub="Framework" Cvendor="Keil" Cversion="3.5.0" condition="STM32F1xx STDPERIPH">
        <package name="STM32F1xx_DFP" schemaVersion="1.2" url="http://www.keil.com/pack/" vendor="Keil" version="2.4.0"/>
        <targetInfos>
          <targetInfo name="Target 1"/>
        </targetInfos>
      </component>
      <component Cclass="Device" Cgroup="StdPeriph Drivers" Csub="GPIO" Cvendor="Keil" Cversion="3.5.0" condition="STM32F1xx STDPERIPH RCC">
        <package name="STM32F1xx_DFP" schemaVersion="1.2" url="http://www.keil.com/pack/" vendor="Keil" version="2.4.0"/>
        <targetInfos>
          <targetInfo name="Target 1"/>
        </targetInfos>
      </component>
      <component Cclass="Device" Cgroup="StdPeriph Drivers" Csub="RCC" Cvendor="Keil" Cversion="3.5.0" condition="STM32F1xx STDPERIPH">
        <package name="STM32F1xx_DFP" schemaVersion="1.2" url="http://www.keil.com/pack/" vendor="Keil" version="2.4.0"/>
        <targetInfos>
          <targetInfo name="Target 1"/>
        </targetInfos>
      </component>
      <component Cclass="Device" Cgroup="StdPeriph Drivers" Csub="I2C" Cvendor="Keil" Cversion="3.5.0" condition="STM32F1xx STDPERIPH RCC">
        <package name="STM32F1xx_DFP" schemaVersion="1.2" url="http://www.keil.com/pack/" vendor="Keil" version="2.4.0"/>
        <targetInfos>
          <targetInfo name="Target 1"/>
        </targetInfos>
      </component>
      <component Cclass="Device" Cgroup="StdPeriph Drivers" Csub="USART" Cvendor="Keil" Cversion="3.5.0" condition="STM32F1xx STDPERIPH RCC">
        <package name="STM32F1xx_DFP" schemaVersion="1.2" url="http://www.keil.com/pack/" vendor="Keil" version="2.4.0"/>
        <targetInfos>
          <targetInfo name="Target 1"/>
        </targetInfos>
      </component>
    </components>
    <files/>
  </RTE>

</Project>
`;
}

function postProcessProject(parsedJson: any, isSTM32: boolean, selectedComps: any[]) {
  if (isSTM32) {
    if (!parsedJson.files) {
      parsedJson.files = [];
    }
    const prefixes = (selectedComps || [])
      .map(c => (c.macroPrefix || '').toLowerCase())
      .filter(Boolean);

    // 1. Load baseline template files recursively
    const templatePath = path.join(process.cwd(), "data", "templates", "stm32", "标准库模板样板");
    const templateFiles = getTemplateFilesRecursively(templatePath);

    // 2. Identify and normalize AI generated files
    const aiFiles = parsedJson.files;
    const finalFilesMap = new Map<string, FileEntry>();

    // Put all template files in the map first
    for (const tf of templateFiles) {
      finalFilesMap.set(tf.path, tf);
    }

    // Filter AI files:
    // - Exclude delay, conf, it files as we handle them separately.
    // - Exclude duplicate driver files if they match component macro prefixes.
    const filteredAiFiles = aiFiles.filter((f: any) => {
      const pLower = f.path.toLowerCase();
      if (pLower.includes('delay') || pLower.includes('stm32f10x_conf') || pLower.includes('stm32f10x_it')) {
        return false;
      }
      return !prefixes.some(pref => pLower.includes(pref));
    });

    // Process AI files, normalize paths (relocate src/* and include/* to user/*)
    for (const af of filteredAiFiles) {
      let normPath = af.path.replace(/\\/g, '/');
      
      // If AI generated platformio.ini, ignore it, we generate a customized one
      if (normPath.toLowerCase() === 'platformio.ini') {
        continue;
      }
      
      // Normalize 'src/main.c' -> 'user/main.c', 'src/pins.h' -> 'user/pins.h', etc.
      if (normPath.startsWith('src/')) {
        normPath = normPath.replace(/^src\//, 'user/');
      } else if (normPath.startsWith('include/')) {
        normPath = normPath.replace(/^include\//, 'user/');
      }
      
      // Store AI file (overwriting template placeholders like user/main.c)
      finalFilesMap.set(normPath, {
        path: normPath,
        content: af.content,
        language: af.language
      });
    }

    // 3. Relocate and append standard scaffold files (delay, oled, dht drivers)
    const scaffoldDrivers = stm32ScaffoldFiles
      .filter(f => {
        const pLower = f.path.toLowerCase();
        // Exclude system config and ISR templates as they are provided by standard library template
        return !pLower.includes('stm32f10x_conf') && !pLower.includes('stm32f10x_it');
      })
      .map(f => {
        const fileName = path.basename(f.path);
        const language = f.language;
        return {
          path: `user/${fileName}`,
          content: f.content,
          language
        };
      });

    for (const sd of scaffoldDrivers) {
      // Only inject if not already generated by AI (AI generated takes precedence)
      if (!finalFilesMap.has(sd.path)) {
        finalFilesMap.set(sd.path, sd);
      }
    }

    // 4. Force inject custom platformio.ini
    const standardPioIni = `[platformio]
src_dir = user
include_dir = user

[env:bluepill_f103c8]
platform = ststm32
board = bluepill_f103c8
framework = spl
build_flags =
  -D STM32F10X_MD
  -D USE_STDPERIPH_DRIVER
`;
    finalFilesMap.set("platformio.ini", {
      path: "platformio.ini",
      content: standardPioIni,
      language: "ini"
    });

    // 5. Build preliminary file list to update project XML
    let filesList = Array.from(finalFilesMap.values());

    // 6. Update Keil project XML
    const projectXmlFile = filesList.find(f => f.path.toLowerCase() === 'project.uvprojx');
    if (projectXmlFile) {
      const updatedXml = updateKeilProjectUserFiles(projectXmlFile.content, filesList);
      projectXmlFile.content = updatedXml;
    }

    // 7. Append Keil guidelines to README
    const keilReadmeInstructions = `

## Keil MDK (μVision) 编译与烧录指南

本项目已包含完整的标准外设库与启动文件，您可以直接进行离线编译：

### 编译步骤
1. **打开项目**：双击项目根目录下的 \`project.uvprojx\`。
2. **一键编译**：在 Keil 菜单栏中点击 **Build** 按钮（或按快捷键 **F7**）开始编译。项目将自动编译本地 \`user/\`、\`library/\` 和 \`start/\` 目录下的所有文件并生成 \`Objects/project.hex\`。
3. **烧录固件**：
   - 使用 ST-Link / J-Link 连接开发板。
   - 在 Keil 的 Project Options -> Debug 中选择您的调试器。
   - 点击 **Download** 按钮（或按快捷键 **F8**）将程序烧录至芯片。
`;

    const readmeFile = filesList.find(f => f.path.toLowerCase() === 'readme.md');
    if (readmeFile) {
      readmeFile.content += keilReadmeInstructions;
    } else {
      filesList.push({
        path: "README.md",
        content: parsedJson.readmeText ? parsedJson.readmeText + keilReadmeInstructions : keilReadmeInstructions,
        language: "markdown"
      });
    }

    parsedJson.files = filesList;
  }

  // Force synchronize code files with connections schema to guarantee 100% alignment
  if (parsedJson.files && parsedJson.connections) {
    parsedJson.files = syncCodeFromConnections(
      parsedJson.files,
      parsedJson.connections,
      isSTM32 ? "STM32" : "ESP32",
      selectedComps
    );
  }
}

// API Routes
async function callDeepSeek(prompt: string, jsonSchema: any, model?: string): Promise<string> {
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
  if (!deepseekApiKey) {
    throw new Error("检测到服务端未配置 DEEPSEEK_API_KEY。请先前往 AI Studio 环境变量设置面板中，填入 DEEPSEEK_API_KEY 密钥，即可成功连接。");
  }

  const base = process.env.DEEPSEEK_API_BASE || "https://api.deepseek.com";
  const selectedModel = model || process.env.DEEPSEEK_MODEL || "deepseek-chat";
  console.log(`[DeepSeek API] 发起模型请求，基址: ${base}，模型: ${selectedModel}`);

  const response = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${deepseekApiKey}`
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [
        {
          role: "system",
          content: `You are an elite IoT system compiler and firmware architect. You must compile and generate output strictly compliant with the requested JSON schema. Do not write markdown tags like \`\`\`json. Return a raw valid JSON object match: ${JSON.stringify(jsonSchema)}`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      stream: true
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`连接 DeepSeek API 发生错误 (HTTP ${response.status}): ${errText}`);
  }

  if (!response.body) {
    throw new Error("DeepSeek API 响应体为空。");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;
      if (trimmed.startsWith("data: ")) {
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.content) {
            fullContent += delta.content;
          }
        } catch (e) {
          // Ignore partial line errors
        }
      }
    }
  }

  if (!fullContent) {
    throw new Error("DeepSeek 未返回有效的 JSON 文本内容。");
  }
  return fullContent;
}

interface AiLearningReview {
  score: number;
  feedback: string;
  strengths: string[];
  problems: string[];
  suggestions: string[];
}

interface ObjectiveAssessment {
  total: number;
  correct: number;
  incorrect: Array<{
    prompt: string;
    studentAnswer: string;
    correctAnswer: string;
  }>;
  shortAnswered: number;
  shortTotal: number;
}

function safeParseLearningContent(content: string) {
  try {
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.prompts) && Array.isArray(parsed.responses)) {
      return parsed as {
        task?: string;
        rubric?: string;
        prompts: string[];
        questions?: LearningQuestion[];
        responses: string[];
        steps?: Array<{
          stepId: LearningTaskType;
          index: string;
          title: string;
          task: string;
          prompts: string[];
          questions?: LearningQuestion[];
          responses: string[];
          objectiveSummary?: {
            total: number;
            correct: number;
          };
          rubric?: string;
          completed?: boolean;
        }>;
        projectName?: string;
        objectiveSummary?: {
          total: number;
          correct: number;
        };
      };
    }
  } catch {
    return null;
  }
  return null;
}

function getAiReviewRubric(taskType: LearningTaskType): string {
  const rubrics: Record<LearningTaskType, string> = {
    requirement: [
      "是否能把真实应用场景转化为明确的物联网功能需求",
      "是否说明输入、处理、输出和报警条件",
      "是否能描述系统服务的真实问题和使用对象"
    ].join("\n"),
    components: [
      "是否能说明主控、传感器、显示、报警和通信模块的作用",
      "是否能区分传感器、执行器、显示模块和通信模块",
      "是否能把器件选择与实验需求建立联系"
    ].join("\n"),
    interfaces: [
      "是否能识别 GPIO、ADC、I2C、USART 等接口类型",
      "是否能说明不同模块为什么使用对应接口",
      "是否能把接口类型与引脚连接对应起来"
    ].join("\n"),
    wiring: [
      "是否能解释主控与外设的连接关系",
      "是否能识别总线共享和独占引脚",
      "是否能把虚拟接线图、引脚表和代码宏定义关联起来"
    ].join("\n"),
    safety: [
      "是否识别 5V 与 3.3V 电平风险",
      "是否说明所有模块需要共地",
      "是否发现蜂鸣器、继电器、电机等执行器需要驱动电路",
      "是否能提出合理的电平保护或驱动改进建议"
    ].join("\n"),
    code: [
      "是否能说明数据采集、显示、阈值判断和报警控制流程",
      "是否能找到关键代码或关键文件",
      "是否能把程序逻辑与硬件现象对应起来"
    ].join("\n"),
    export: [
      "是否理解工程包文件结构",
      "是否能说明 main、pins、README 等关键文件作用",
      "是否具备将虚拟实验迁移到真实工程的意识"
    ].join("\n"),
    reflection: [
      "是否能提出合理优化或拓展方案",
      "是否体现工程迭代、安全稳定和迁移应用意识",
      "是否能从完成实验走向改进设计"
    ].join("\n"),
  };
  return rubrics[taskType] || "请根据学生回答的完整性、准确性、工程理解和改进建议进行评价。";
}

function normalizeAiReview(value: any): AiLearningReview {
  const toList = (input: any): string[] => {
    if (Array.isArray(input)) return input.map(item => String(item)).filter(Boolean).slice(0, 4);
    if (input) return [String(input)];
    return [];
  };
  const score = Math.max(0, Math.min(100, Number(value?.score ?? 0) || 0));
  return {
    score,
    feedback: String(value?.feedback || "AI 已完成诊断性评价。"),
    strengths: toList(value?.strengths),
    problems: toList(value?.problems),
    suggestions: toList(value?.suggestions),
  };
}

function formatAiReview(review: AiLearningReview): string {
  const lines = [
    `总体评价：${review.feedback}`,
  ];
  if (review.strengths.length) {
    lines.push("", "优点：", ...review.strengths.map(item => `- ${item}`));
  }
  if (review.problems.length) {
    lines.push("", "需要改进：", ...review.problems.map(item => `- ${item}`));
  }
  if (review.suggestions.length) {
    lines.push("", "改进建议：", ...review.suggestions.map(item => `- ${item}`));
  }
  return lines.join("\n");
}

function formatLearningEvidence(parsed: ReturnType<typeof safeParseLearningContent>, fallbackContent: string) {
  if (!parsed) return fallbackContent;

  if (parsed.steps?.length) {
    return parsed.steps.map(step => {
      const questions = step.questions || step.prompts.map(prompt => ({
        type: "short" as const,
        prompt,
      }));
      const lines = questions.map((question, index) => {
        const answerLine = question.answer ? `\n标准答案：${question.answer}` : "";
        const explanationLine = question.explanation ? `\n解析：${question.explanation}` : "";
        return [
          `${index + 1}. [${question.type}] ${question.prompt}`,
          question.options?.length ? `选项：${question.options.join(" / ")}` : "",
          `学生回答：${step.responses[index] || "未填写"}`,
          answerLine.trim(),
          explanationLine.trim(),
        ].filter(Boolean).join("\n");
      });
      const objectiveLine = step.objectiveSummary
        ? `客观题完成情况：${step.objectiveSummary.correct}/${step.objectiveSummary.total}`
        : "";
      return [
        `【${step.index} ${step.title}】`,
        `任务：${step.task}`,
        objectiveLine,
        ...lines,
        step.rubric ? `评价标准：${step.rubric}` : "",
      ].filter(Boolean).join("\n");
    }).join("\n\n");
  }

  const questions = parsed.questions || parsed.prompts.map(prompt => ({
    type: "short" as const,
    prompt,
  }));
  const lines = questions.map((question, index) => {
    const answerLine = question.answer ? `\n标准答案：${question.answer}` : "";
    const explanationLine = question.explanation ? `\n解析：${question.explanation}` : "";
    return [
      `${index + 1}. [${question.type}] ${question.prompt}`,
      question.options?.length ? `选项：${question.options.join(" / ")}` : "",
      `学生回答：${parsed.responses[index] || "未填写"}`,
      answerLine.trim(),
      explanationLine.trim(),
    ].filter(Boolean).join("\n");
  });

  if (parsed.objectiveSummary) {
    lines.unshift(`客观题完成情况：${parsed.objectiveSummary.correct}/${parsed.objectiveSummary.total}`);
  }
  return lines.join("\n\n");
}

function assessObjectiveQuestions(parsed: ReturnType<typeof safeParseLearningContent>): ObjectiveAssessment {
  if (!parsed) {
    return { total: 0, correct: 0, incorrect: [], shortAnswered: 0, shortTotal: 0 };
  }

  if (parsed.steps?.length) {
    return parsed.steps.reduce<ObjectiveAssessment>((total, step) => {
      const questions = step.questions || step.prompts.map(prompt => ({
        type: "short" as const,
        prompt,
      }));
      const next = assessObjectiveQuestions({
        prompts: step.prompts,
        questions,
        responses: step.responses,
        objectiveSummary: step.objectiveSummary,
        task: step.task,
        rubric: step.rubric,
      });
      return {
        total: total.total + next.total,
        correct: total.correct + next.correct,
        incorrect: [...total.incorrect, ...next.incorrect],
        shortAnswered: total.shortAnswered + next.shortAnswered,
        shortTotal: total.shortTotal + next.shortTotal,
      };
    }, { total: 0, correct: 0, incorrect: [], shortAnswered: 0, shortTotal: 0 });
  }

  const questions = parsed.questions || parsed.prompts.map(prompt => ({
    type: "short" as const,
    prompt,
  }));
  const result: ObjectiveAssessment = {
    total: 0,
    correct: 0,
    incorrect: [],
    shortAnswered: 0,
    shortTotal: 0,
  };

  questions.forEach((question, index) => {
    const studentAnswer = (parsed.responses[index] || "").trim();
    if (question.type === "short") {
      result.shortTotal += 1;
      if (studentAnswer) result.shortAnswered += 1;
      return;
    }
    if (!question.answer) return;
    result.total += 1;
    if (studentAnswer === question.answer) {
      result.correct += 1;
    } else {
      result.incorrect.push({
        prompt: question.prompt,
        studentAnswer: studentAnswer || "未作答",
        correctAnswer: question.answer,
      });
    }
  });

  return result;
}

function isSameLearningProcess(target: LearningSubmission, candidate: LearningSubmission) {
  if (target.classId !== candidate.classId || target.studentId !== candidate.studentId) return false;
  if (target.projectId) return candidate.projectId === target.projectId;
  if (target.projectName) return candidate.projectName === target.projectName;
  return true;
}

function getSubmissionTaskTypes(submission: LearningSubmission): LearningTaskType[] {
  const parsed = safeParseLearningContent(submission.content);
  if (parsed?.steps?.length) {
    const taskTypes = parsed.steps
      .map(step => step.stepId)
      .filter((stepId): stepId is LearningTaskType => LEARNING_TASK_ORDER.includes(stepId));
    return Array.from(new Set(taskTypes));
  }
  return [submission.taskType];
}

function buildLearningProcessContext(submission: LearningSubmission, allSubmissions: LearningSubmission[] = [submission]) {
  const byId = new Map<string, LearningSubmission>();
  allSubmissions
    .filter(item => isSameLearningProcess(submission, item))
    .forEach(item => byId.set(item.submissionId, item));
  byId.set(submission.submissionId, submission);

  const processSubmissions = Array.from(byId.values())
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const completedTaskTypes = LEARNING_TASK_ORDER.filter(taskType =>
    processSubmissions.some(item => getSubmissionTaskTypes(item).includes(taskType))
  );
  const missingTaskTypes = LEARNING_TASK_ORDER.filter(taskType => !completedTaskTypes.includes(taskType));
  const objective = processSubmissions.reduce<ObjectiveAssessment>((total, item) => {
    const next = assessObjectiveQuestions(safeParseLearningContent(item.content));
    return {
      total: total.total + next.total,
      correct: total.correct + next.correct,
      incorrect: [...total.incorrect, ...next.incorrect],
      shortAnswered: total.shortAnswered + next.shortAnswered,
      shortTotal: total.shortTotal + next.shortTotal,
    };
  }, { total: 0, correct: 0, incorrect: [], shortAnswered: 0, shortTotal: 0 });

  const evidence = processSubmissions.map((item, index) => {
    const parsed = safeParseLearningContent(item.content);
    return [
      `#${index + 1} ${getTaskDimensionName(item.taskType)} / ${item.title}`,
      item.submissionId === submission.submissionId ? "当前选中提交" : "同一实验过程提交",
      `提交时间：${item.createdAt}`,
      formatLearningEvidence(parsed, item.content).slice(0, 1200),
    ].join("\n");
  }).join("\n\n");

  const scope = {
    submissions: processSubmissions.length,
    completedTasks: completedTaskTypes.length,
    missingTasks: missingTaskTypes,
    isComplete: missingTaskTypes.length === 0,
  };
  const coverageText = `已收集 ${completedTaskTypes.length}/${LEARNING_TASK_ORDER.length} 个学习步骤：${completedTaskTypes.map(getTaskDimensionName).join("、") || "暂无"}。${missingTaskTypes.length ? `缺少：${missingTaskTypes.map(getTaskDimensionName).join("、")}。` : "学习流程证据完整。"}`;

  return {
    submissions: processSubmissions,
    completedTaskTypes,
    missingTaskTypes,
    objective,
    evidence,
    scope,
    coverageText,
  };
}

function buildLocalLearningReview(
  submission: LearningSubmission,
  parsed: ReturnType<typeof safeParseLearningContent>,
  processContext = buildLearningProcessContext(submission)
): AiLearningReview {
  const objective = processContext.objective.total || processContext.objective.shortTotal
    ? processContext.objective
    : assessObjectiveQuestions(parsed);
  const objectiveScore = objective.total ? Math.round((objective.correct / objective.total) * 80) : 55;
  const shortBonus = objective.shortTotal === 0 ? 20 : Math.round((objective.shortAnswered / objective.shortTotal) * 20);
  const coveragePenalty = processContext.scope.isComplete ? 0 : Math.min(12, processContext.scope.missingTasks.length * 2);
  const score = Math.max(0, Math.min(100, objectiveScore + shortBonus - coveragePenalty));
  const accuracyText = objective.total
    ? `客观题完成 ${objective.correct}/${objective.total}`
    : "暂无客观题判分数据";
  const missed = objective.incorrect.slice(0, 3).map(item => `“${item.prompt}”应关注标准答案：${item.correctAnswer}`);
  const evidenceWarning = processContext.scope.isComplete
    ? "学习流程证据已覆盖 8 个步骤。"
    : `${processContext.coverageText}当前评价只能作为阶段性助评，不能视为完整学习结论。`;

  return {
    score,
    feedback: `${accuracyText}。${evidenceWarning}该结果基于已提交的题目作答和过程记录自动形成，可作为教师批阅前的诊断参考。`,
    strengths: [
      objective.correct > 0 ? "已完成部分过程检测题，具备可追踪的学习证据。" : "已提交当前步骤，学习过程已被记录。",
      parsed?.projectName || submission.projectName ? "提交内容已关联具体仿真实验项目。" : "提交内容可继续补充项目关联信息。",
    ],
    problems: missed.length
      ? missed
      : processContext.scope.isComplete
        ? ["暂未发现明确错题；建议教师继续结合课堂表现复核。"]
        : [`过程证据尚不完整，缺少 ${processContext.scope.missingTasks.map(getTaskDimensionName).join("、")} 等步骤。`],
    suggestions: [
      "先复盘错题对应的器件接口、接线安全或代码流程概念。",
      processContext.scope.isComplete
        ? "教师可结合标准答案和学生选择，给出更具体的二次反馈。"
        : "建议等待学生补齐前序或后续步骤后，再生成完整过程画像与综合评价。",
    ],
  };
}

function parseModelJson(raw: string) {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim());
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Model did not return valid JSON.");
  }
}

async function evaluateLearningSubmissionWithAi(
  submission: LearningSubmission,
  allSubmissions: LearningSubmission[] = [submission]
): Promise<LearningSubmission> {
  const parsed = safeParseLearningContent(submission.content);
  const rubric = parsed?.rubric || getAiReviewRubric(submission.taskType);
  const processContext = buildLearningProcessContext(submission, allSubmissions);
  const objective = processContext.objective.total || processContext.objective.shortTotal
    ? processContext.objective
    : assessObjectiveQuestions(parsed);
  const prompt = `
你是一名物联网虚拟仿真实验课 AI 助教。请对学生提交的学习任务进行诊断性评价。

要求：
1. 评价应服务教学改进，不替代教师最终评价。
2. 评价必须区分“当前步骤表现”和“完整实验过程表现”。
3. 只根据学生已提交内容、任务要求和评价标准判断。
4. 如果学习过程步骤尚未收集完整，必须明确指出证据不足，不要给出完整学习结论。
4. 反馈要具体、温和、可执行。
5. 返回严格 JSON，不要 Markdown。

任务类型：${submission.taskType}
任务标题：${submission.title}
关联项目：${submission.projectName || submission.projectId || "未关联项目"}
证据覆盖：${processContext.coverageText}

当前步骤任务要求：
${parsed?.task || "未提供"}

当前步骤评价标准：
${rubric}

当前步骤问题与回答：
${formatLearningEvidence(parsed, submission.content)}

同一学生同一项目已提交的学习过程证据：
${processContext.evidence}

请返回 JSON：
{
  "score": 0-100,
  "feedback": "总体评价，2-4 句，必须说明证据覆盖是否完整",
  "strengths": ["学生做得好的地方"],
  "problems": ["存在的问题、遗漏，或缺失的过程步骤"],
  "suggestions": ["下一步改进建议，若证据不完整要建议补齐步骤后再综合评价"]
}
`;

  const schema = {
    type: "object",
    properties: {
      score: { type: "number" },
      feedback: { type: "string" },
      strengths: { type: "array", items: { type: "string" } },
      problems: { type: "array", items: { type: "string" } },
      suggestions: { type: "array", items: { type: "string" } },
    },
    required: ["score", "feedback", "strengths", "problems", "suggestions"],
  };

  const now = new Date().toISOString();
  try {
    let raw = "";
    if (process.env.DEEPSEEK_API_KEY) {
      raw = await callDeepSeek(prompt, schema, process.env.DEEPSEEK_MODEL || "deepseek-chat");
    } else if (hasValidGeminiKey) {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              feedback: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              problems: { type: Type.ARRAY, items: { type: Type.STRING } },
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["score", "feedback", "strengths", "problems", "suggestions"],
          },
        },
      });
      raw = response.text || "";
    } else {
      const review = buildLocalLearningReview(submission, parsed, processContext);
      return {
        ...submission,
        aiStatus: "completed",
        aiScore: review.score,
        aiRubric: rubric,
        aiFeedback: formatAiReview(review),
        aiSuggestions: review.suggestions.join("\n"),
        aiObjectiveCorrect: objective.correct,
        aiObjectiveTotal: objective.total,
        aiEvidenceScope: processContext.scope,
        aiEvaluatedAt: now,
        updatedAt: now,
      };
    }

    const review = normalizeAiReview(parseModelJson(raw));
    return {
      ...submission,
      aiStatus: "completed",
      aiScore: review.score,
      aiRubric: rubric,
      aiFeedback: formatAiReview(review),
      aiSuggestions: review.suggestions.join("\n"),
      aiObjectiveCorrect: objective.correct,
      aiObjectiveTotal: objective.total,
      aiEvidenceScope: processContext.scope,
      aiEvaluatedAt: now,
      updatedAt: now,
    };
  } catch (err) {
    console.warn("[AI Learning Review] Evaluation failed:", err);
    const review = buildLocalLearningReview(submission, parsed, processContext);
    return {
      ...submission,
      aiStatus: "completed",
      aiScore: review.score,
      aiRubric: rubric,
      aiFeedback: formatAiReview(review),
      aiSuggestions: review.suggestions.join("\n"),
      aiObjectiveCorrect: objective.correct,
      aiObjectiveTotal: objective.total,
      aiEvidenceScope: processContext.scope,
      aiEvaluatedAt: now,
      updatedAt: now,
    };
  }
}

async function evaluateAndPersistSubmission(submissionId: string): Promise<LearningSubmission | null> {
  const submissions = readDbFile<LearningSubmission[]>("learning_submissions.json", []);
  const index = submissions.findIndex(item => item.submissionId === submissionId);
  if (index < 0) return null;

  const pendingSubmission: LearningSubmission = {
    ...submissions[index],
    aiStatus: "pending",
    updatedAt: new Date().toISOString(),
  };
  submissions[index] = pendingSubmission;
  writeDbFile("learning_submissions.json", submissions);

  const reviewedSubmission = await evaluateLearningSubmissionWithAi(pendingSubmission, submissions);
  const latestSubmissions = readDbFile<LearningSubmission[]>("learning_submissions.json", []);
  const latestIndex = latestSubmissions.findIndex(item => item.submissionId === submissionId);
  if (latestIndex < 0) return reviewedSubmission;

  latestSubmissions[latestIndex] = {
    ...latestSubmissions[latestIndex],
    aiFeedback: reviewedSubmission.aiFeedback,
    aiScore: reviewedSubmission.aiScore,
    aiRubric: reviewedSubmission.aiRubric,
    aiSuggestions: reviewedSubmission.aiSuggestions,
    aiStatus: reviewedSubmission.aiStatus,
    aiEvaluatedAt: reviewedSubmission.aiEvaluatedAt,
    aiObjectiveCorrect: reviewedSubmission.aiObjectiveCorrect,
    aiObjectiveTotal: reviewedSubmission.aiObjectiveTotal,
    aiEvidenceScope: reviewedSubmission.aiEvidenceScope,
    updatedAt: reviewedSubmission.updatedAt,
  };
  writeDbFile("learning_submissions.json", latestSubmissions);
  return latestSubmissions[latestIndex];
}

function getPortraitCoverage(submissions: LearningSubmission[]) {
  const scored = submissions
    .map(item => item.aiScore ?? item.score)
    .filter((score): score is number => typeof score === "number" && !Number.isNaN(score));
  return {
    submissions: submissions.length,
    completedTasks: new Set(submissions.flatMap(getSubmissionTaskTypes)).size,
    averageAiScore: scored.length
      ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length)
      : undefined,
  };
}

function getTaskDimensionName(taskType: LearningTaskType) {
  const names: Record<LearningTaskType, string> = {
    requirement: "需求理解",
    components: "器件选型",
    interfaces: "接口识别",
    wiring: "虚拟接线",
    safety: "安全判断",
    code: "代码理解",
    export: "工程迁移",
    reflection: "反思改进",
  };
  return names[taskType] || taskType;
}

function getDimensionLevel(score: number): "strong" | "stable" | "developing" | "risk" {
  if (score >= 88) return "strong";
  if (score >= 75) return "stable";
  if (score >= 60) return "developing";
  return "risk";
}

function buildLocalPortraitDimensions(submissions: LearningSubmission[]): LearningPortrait["dimensions"] {
  const grouped = new Map<LearningTaskType, Array<{ score?: number; objectiveCorrect?: number; objectiveTotal?: number; title: string }>>();
  submissions.forEach(submission => {
    const parsed = safeParseLearningContent(submission.content);
    if (parsed?.steps?.length) {
      parsed.steps.forEach(step => {
        const list = grouped.get(step.stepId) || [];
        const objectiveCorrect = step.objectiveSummary?.correct || 0;
        const objectiveTotal = step.objectiveSummary?.total || 0;
        const score = objectiveTotal ? Math.round((objectiveCorrect / objectiveTotal) * 100) : undefined;
        list.push({
          score,
          objectiveCorrect,
          objectiveTotal,
          title: step.title,
        });
        grouped.set(step.stepId, list);
      });
      return;
    }

    const list = grouped.get(submission.taskType) || [];
    list.push({
      score: submission.aiScore ?? submission.score,
      objectiveCorrect: submission.aiObjectiveCorrect,
      objectiveTotal: submission.aiObjectiveTotal,
      title: submission.title,
    });
    grouped.set(submission.taskType, list);
  });

  return Array.from(grouped.entries()).map(([taskType, list]) => {
    const scored = list
      .map(item => item.score)
      .filter((score): score is number => typeof score === "number" && !Number.isNaN(score));
    const score = scored.length
      ? Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length)
      : 60;
    const objectiveTotals = list.reduce((sum, item) => sum + (item.objectiveTotal || 0), 0);
    const objectiveCorrect = list.reduce((sum, item) => sum + (item.objectiveCorrect || 0), 0);
    const objectiveText = objectiveTotals ? `客观题 ${objectiveCorrect}/${objectiveTotals}` : "暂无客观题统计";
    const lowScore = score < 70;
    return {
      name: getTaskDimensionName(taskType),
      level: getDimensionLevel(score),
      score,
      evidence: `${objectiveText}，提交 ${list.length} 条，平均表现 ${score}/100。`,
      suggestion: lowScore
        ? `建议教师针对“${getTaskDimensionName(taskType)}”安排讲解、演示或错题复盘。`
        : `可以让学生在“${getTaskDimensionName(taskType)}”上进一步解释依据，提升表达完整度。`,
    };
  }).sort((a, b) => (a.score ?? 0) - (b.score ?? 0)).slice(0, 6);
}

function buildTeachingFocus(dimensions: LearningPortrait["dimensions"] = []): LearningPortrait["teachingFocus"] {
  const focusDimensions = [...dimensions]
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
    .slice(0, 3);
  if (!focusDimensions.length) {
    return [{
      title: "补充学习证据",
      reason: "当前提交记录不足，暂时无法稳定判断学生或班级薄弱点。",
      action: "先组织学生完成完整学习流程提交，再生成画像进行课堂诊断。",
    }];
  }
  return focusDimensions.map(dimension => ({
    title: dimension.name,
    reason: dimension.evidence,
    action: dimension.suggestion,
  }));
}

function normalizePortrait(
  value: any,
  scope: "student" | "class",
  title: string,
  coverage: LearningPortrait["coverage"],
  fallbackDimensions: LearningPortrait["dimensions"] = []
): LearningPortrait {
  const toList = (input: any): string[] => {
    if (Array.isArray(input)) return input.map(item => String(item)).filter(Boolean).slice(0, 5);
    if (input) return [String(input)];
    return [];
  };
  const toTeachingFocus = (input: any): LearningPortrait["teachingFocus"] => {
    if (!Array.isArray(input)) return [];
    return input.map((item: any) => ({
      title: String(item?.title || item?.name || "课堂讲解重点"),
      reason: String(item?.reason || item?.evidence || "来自学习过程画像的诊断结果。"),
      action: String(item?.action || item?.suggestion || "结合学生提交记录安排讲解、演示或错题复盘。"),
    })).filter(item => item.title).slice(0, 4);
  };
  const dimensions = Array.isArray(value?.dimensions)
    ? value.dimensions.map((item: any) => {
      const level = ["strong", "stable", "developing", "risk"].includes(item?.level) ? item.level : "developing";
      const score = item?.score === undefined ? undefined : Math.max(0, Math.min(100, Number(item.score) || 0));
      return {
        name: String(item?.name || "学习维度"),
        level,
        score,
        evidence: String(item?.evidence || "暂无明确证据。"),
        suggestion: String(item?.suggestion || "建议结合提交记录继续观察。"),
      };
    }).slice(0, 6)
    : undefined;
  return {
    scope,
    title,
    summary: String(value?.summary || "学习过程画像已生成。"),
    tags: toList(value?.tags),
    strengths: toList(value?.strengths),
    risks: toList(value?.risks),
    suggestions: toList(value?.suggestions),
    dimensions: dimensions?.length ? dimensions : fallbackDimensions,
    focusItems: toList(value?.focusItems).length
      ? toList(value?.focusItems)
      : fallbackDimensions?.filter(item => item.level === "risk" || item.level === "developing").map(item => item.name).slice(0, 4),
    teachingFocus: toTeachingFocus(value?.teachingFocus).length
      ? toTeachingFocus(value?.teachingFocus)
      : buildTeachingFocus(dimensions?.length ? dimensions : fallbackDimensions),
    updatedAt: new Date().toISOString(),
    coverage,
  };
}

function buildFallbackPortrait(scope: "student" | "class", title: string, submissions: LearningSubmission[]): LearningPortrait {
  const coverage = getPortraitCoverage(submissions);
  const dimensions = buildLocalPortraitDimensions(submissions);
  const weakTasks = submissions
    .filter(item => (item.aiScore ?? item.score ?? 100) < 70)
    .map(item => item.title)
    .slice(0, 3);
  return {
    scope,
    title,
    summary: submissions.length
      ? "已根据提交记录形成基础画像。建议教师结合 AI 初评、客观题表现和简答质量继续观察。"
      : "当前还没有足够的学习提交记录，暂不能形成稳定画像。",
    tags: submissions.length ? ["过程性评价", "虚拟仿真实验", "教师复核"] : ["证据不足"],
    strengths: submissions.length ? ["已产生可追踪的学习任务提交记录。"] : ["暂无可分析记录。"],
    risks: weakTasks.length ? weakTasks.map(task => `需要关注：${task}`) : ["暂未发现明显集中风险。"],
    suggestions: [
      "结合学生的选择/判断题结果确认基础概念掌握情况。",
      "重点查看简答题中是否能把仿真实验现象和工程原理联系起来。",
      "教师最终评价应保留人工判断，AI 画像只作为诊断参考。",
    ],
    dimensions,
    focusItems: dimensions?.filter(item => item.level === "risk" || item.level === "developing").map(item => item.name).slice(0, 4) || [],
    teachingFocus: buildTeachingFocus(dimensions),
    updatedAt: new Date().toISOString(),
    coverage,
  };
}

async function generateLearningPortraitWithAi(
  scope: "student" | "class",
  title: string,
  submissions: LearningSubmission[]
): Promise<LearningPortrait> {
  const coverage = getPortraitCoverage(submissions);
  const fallbackDimensions = buildLocalPortraitDimensions(submissions);
  if (!submissions.length) {
    return buildFallbackPortrait(scope, title, submissions);
  }

  const evidence = submissions.slice(0, 20).map((submission, index) => {
    const parsed = safeParseLearningContent(submission.content);
    return [
      `#${index + 1} ${submission.studentName || submission.studentId} / ${submission.title} / ${submission.taskType}`,
      `AI分数：${submission.aiScore ?? "无"}；教师分数：${submission.score ?? "无"}；状态：${submission.status}`,
      submission.aiFeedback ? `AI初评：${submission.aiFeedback}` : "",
      `提交证据：${formatLearningEvidence(parsed, submission.content).slice(0, 1200)}`,
    ].filter(Boolean).join("\n");
  }).join("\n\n");

  const prompt = `
你是一名物联网虚拟仿真实验课程的数据助教。请根据学习任务提交、客观题表现、简答题和已有 AI 初评，生成${scope === "class" ? "班级" : "学生"}学习过程画像。

要求：
1. 不给学生贴负面标签，只做教学诊断。
2. 聚焦：需求理解、器件接口、接线安全、代码理解、工程迁移、反思改进。
3. 输出要便于教师调整教学。
4. 返回严格 JSON，不要 Markdown。

画像对象：${title}
覆盖数据：提交 ${coverage.submissions} 条，覆盖步骤 ${coverage.completedTasks} 个，平均分 ${coverage.averageAiScore ?? "暂无"}

学习证据：
${evidence}

请返回 JSON：
{
  "summary": "总体画像，2-4 句",
  "tags": ["3-5 个学习特征标签"],
  "strengths": ["优势表现"],
  "risks": ["需要关注的风险或薄弱点"],
  "suggestions": ["下一步教学或辅导建议"],
  "dimensions": [
    {
      "name": "需求理解/器件选型/接口识别/虚拟接线/安全判断/代码理解/工程迁移/反思改进",
      "level": "strong/stable/developing/risk",
      "score": 0-100,
      "evidence": "来自提交记录的证据",
      "suggestion": "针对该维度的教学建议"
    }
  ],
  "focusItems": ["教师下一步最应该关注的 2-4 个点"],
  "teachingFocus": [
    {
      "title": "课堂讲解重点名称",
      "reason": "为什么要讲，引用学生表现或班级薄弱证据",
      "action": "建议教师采用的讲法，如演示、错题复盘、对照接线图、代码走读"
    }
  ]
}
`;

  const schema = {
    type: "object",
    properties: {
      summary: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
      strengths: { type: "array", items: { type: "string" } },
      risks: { type: "array", items: { type: "string" } },
      suggestions: { type: "array", items: { type: "string" } },
      dimensions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            level: { type: "string" },
            score: { type: "number" },
            evidence: { type: "string" },
            suggestion: { type: "string" },
          },
          required: ["name", "level", "evidence", "suggestion"],
        },
      },
      focusItems: { type: "array", items: { type: "string" } },
      teachingFocus: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            reason: { type: "string" },
            action: { type: "string" },
          },
          required: ["title", "reason", "action"],
        },
      },
    },
    required: ["summary", "tags", "strengths", "risks", "suggestions"],
  };

  try {
    let raw = "";
    if (process.env.DEEPSEEK_API_KEY) {
      raw = await callDeepSeek(prompt, schema, process.env.DEEPSEEK_MODEL || "deepseek-chat");
    } else if (hasValidGeminiKey) {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              risks: { type: Type.ARRAY, items: { type: Type.STRING } },
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              dimensions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    level: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    evidence: { type: Type.STRING },
                    suggestion: { type: Type.STRING },
                  },
                  required: ["name", "level", "evidence", "suggestion"],
                },
              },
              focusItems: { type: Type.ARRAY, items: { type: Type.STRING } },
              teachingFocus: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    action: { type: Type.STRING },
                  },
                  required: ["title", "reason", "action"],
                },
              },
            },
            required: ["summary", "tags", "strengths", "risks", "suggestions"],
          },
        },
      });
      raw = response.text || "";
    } else {
      throw new Error("AI portrait is unavailable because no AI API key is configured.");
    }
    return normalizePortrait(parseModelJson(raw), scope, title, coverage, fallbackDimensions);
  } catch (err) {
    console.warn("[AI Learning Portrait] Generation failed:", err);
    return buildFallbackPortrait(scope, title, submissions);
  }
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Public hardware registry routes to fetch active components and MCUs without admin rights
app.get("/api/components", async (req, res) => {
  try {
    const components = await fetchComponentsFromDb();
    res.json(components.filter(c => c.active));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "获取组件字典失败" });
  }
});

app.get("/api/mcus", async (req, res) => {
  try {
    const mcus = await fetchMcusFromDb();
    res.json(mcus.filter(m => m.active));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "获取主控字典失败" });
  }
});

// 1. Prompt optimization endpoint
app.post("/api/optimize-prompt", async (req, res) => {
  try {
    const { rawInput, platform, provider, model } = req.body;
    if (!rawInput) {
      return res.status(400).json({ error: "rawInput is required." });
    }

    const targetPlatform = platform || "ESP32";

    const activeMcus = await fetchMcusFromDb();
    const allComps = await fetchComponentsFromDb();
    
    // Semantic RAG retrieval: dynamically fetch Top 5 components matching the user's prompt
    const activeComps = await ragEngine.retrieve(rawInput, allComps, 5);

    const activeSensors = activeComps.filter(c => c.active && c.category === 'Sensor').map(c => `${c.name} (${c.type})`).join(', ');
    const activeDisplays = activeComps.filter(c => c.active && c.category === 'Display').map(c => `${c.name} (${c.type})`).join(', ');
    const activeAlerts = activeComps.filter(c => c.active && (c.category === 'Alert' || c.category === 'Actuator')).map(c => `${c.name} (${c.type})`).join(', ');
    const activeOthers = activeComps.filter(c => c.active && c.category === 'Other').map(c => `${c.name} (${c.type})`).join(', ');
    const activeMcuNames = activeMcus.filter(m => m.active).map(m => m.name).join(', ');

    const promptText = `
      You are an expert IoT architect specializing in ${targetPlatform} systems.
      Your task is to optimize the following raw user prompt into a highly structured, accurate, and detailed prompt.
      This prompt will be passed to a downstream code and schematic generator.
      
      User raw input: "${rawInput}"
      Target platform: ${targetPlatform}

      Please analyze the input, select the most appropriate sensors, displays, alerts, network protocols, and power architecture from the standard hardware set below:
      - Main MCU Platform options: ${activeMcuNames || "ESP32 DevKit, STM32 Blue Pill"}.
      - Sensor options: ${activeSensors || "DHT22, DHT11, Photoresistor, MQ-2 Gas Sensor, HC-SR04 Ultrasonic, or None"}.
      - Display options: ${activeDisplays || "OLED 0.96\" I2C, LCD1602 I2C, or None"}.
      - Alert / Actuator options: ${activeAlerts || "Active Buzzer, SG90 Servo, 5V Relay, LED Indicator, or None"}.
      - Network / Communication module options: ${activeOthers || "ESP8266 Wi-Fi Module (ESP-01S), or None"}.
      - Network / Protocol options: Wi-Fi + MQTT, Wi-Fi + HTTP, Bluetooth, or Offline (Local Only).
      - Power architecture options: USB 5V, DC Jack 9V, LiPo Battery 3.7V, etc.

      Enforce strict rules:
      - If the user discusses temperature or humidity, prefer a temperature sensor from the active set (e.g. DHT22/AHT20).
      - If they discuss displays, prefer an active display (e.g. OLED SSD1306 / LCD1602).
      - If they discuss alarms, prefer an active alert device (e.g. Active Buzzer).
      - If the main MCU is STM32 (or has no native Wi-Fi) and the system requires internet/Wi-Fi/MQTT access, you MUST explicitly include the external "ESP8266 Wi-Fi 模块" (ESP-01S) as a communication module in the recommended network components.
      - Ensure you fill in all details realistically.

      CRITICAL FORMATTING INSTRUCTION:
      The field "optimizedPrompt" MUST strictly follow this exact template and structure in professional, technical Chinese (中文). Do not use any other section headers or layouts:

      项目目标：[A detailed one-paragraph description of the project goal, MCU selection, sensor reading, display, alarm trigger, and network protocols used.]
      硬件配置：
      - 主控：[MCU model, e.g. ESP32-WROOM-32E or STM32F103C8T6 (BluePill)]
      - 传感器：[Sensor name, e.g. DHT22 (数字信号，单总线)]
      - 显示：[Display model, e.g. 0.96寸OLED，SSD1306驱动，I2C接口]
      - 报警器：[Alarm device, e.g. 有源5V蜂鸣器 (数字控制)]
      - 电源：[Power method, e.g. Micro USB 5V供电 or USB 5V]
      接线说明 (建议GPIO分配)：
      - [Pin connection 1, e.g. DHT22数据脚接GPIO04]
      - [Pin connection 2, e.g. OLED的SDA接GPIO21，SCL接GPIO22]
      - [Pin connection 3, e.g. 蜂鸣器控制脚接GPIO13]
      - [Other connections, e.g. 所有GND共地，VCC接3.3V]
      软件功能需求：
      1. [Detailed software step 1, e.g. 初始化Wi-Fi并连接至指定SSID和密码]
      2. [Detailed software step 2, e.g. 配置MQTT客户端，连接至指定的Broker地址，订阅和发布主题]
      3. [Detailed software step 3, e.g. 周期性读取传感器数据，并显示在OLED上]
      4. [Detailed software step 4, e.g. 超阈值报警逻辑]
      5. [Detailed software step 5, e.g. 每次读取后构建JSON格式数据包，通过MQTT/HTTP上传]
      6. [Detailed software step 6, e.g. 支持库及OTA/更新要求]
      注意事项：[Precautions such as firmware level, voltage matching, I2C address, etc.]

      Return the response strictly adhering to the JSON schema specified.
    `;

    const deepseekSchema = {
      type: "object",
      properties: {
        projectName: { type: "string" },
        optimizedPrompt: { type: "string", description: "Highly structured and optimized specification written in Chinese (中文)." },
        recommendedPlatform: { type: "string" },
        recommendedSensors: { type: "string" },
        recommendedDisplays: { type: "string" },
        recommendedAlerts: { type: "string" },
        recommendedNetwork: { type: "string" },
        recommendedPower: { type: "string" }
      },
      required: [
        "projectName", 
        "optimizedPrompt", 
        "recommendedPlatform", 
        "recommendedSensors", 
        "recommendedDisplays", 
        "recommendedAlerts", 
        "recommendedNetwork", 
        "recommendedPower"
      ]
    };

    if (provider === "deepseek" || !hasValidGeminiKey) {
      const textResult = await callDeepSeek(promptText, deepseekSchema, model);
      const parsedJson = JSON.parse(textResult.trim());
      return res.json(parsedJson);
    }

    // Modern Gemini 3.5 Flash implementation
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            projectName: { 
              type: Type.STRING, 
              description: "A descriptive, short, English name for the project (e.g. Smart Greenhouse Monitor)." 
            },
            optimizedPrompt: { 
              type: Type.STRING, 
              description: "Optimized, comprehensive, structured system requirement prompt based on the user's requirements. MUST be written in Chinese (中文)." 
            },
            recommendedPlatform: { 
              type: Type.STRING, 
              description: "Main MCU selected, either 'ESP32' or 'STM32'." 
            },
            recommendedSensors: { 
              type: Type.STRING, 
              description: "Recommended sensor, e.g. 'DHT22', 'Photoresistor', or 'None'." 
            },
            recommendedDisplays: { 
              type: Type.STRING, 
              description: "Recommended display, e.g. 'OLED 0.96\" I2C', or 'None'." 
            },
            recommendedAlerts: { 
              type: Type.STRING, 
              description: "Recommended buzzers, LEDs or relays, e.g. 'Active Buzzer', '5V Relay', or 'None'." 
            },
            recommendedNetwork: { 
              type: Type.STRING, 
              description: "Recommended protocol, e.g. 'Wi-Fi + MQTT', 'Wi-Fi + HTTP', or 'Offline (Local Only)'." 
            },
            recommendedPower: { 
              type: Type.STRING, 
              description: "Recommended power layout, e.g. 'USB 5V', 'Battery 3.7V'." 
            }
          },
          required: [
            "projectName", 
            "optimizedPrompt", 
            "recommendedPlatform", 
            "recommendedSensors", 
            "recommendedDisplays", 
            "recommendedAlerts", 
            "recommendedNetwork", 
            "recommendedPower"
          ]
        }
      }
    });

    const textResult = response.text;
    if (!textResult) {
      return res.status(500).json({ error: "Failed to generate optimized prompt." });
    }

    const parsedJson = JSON.parse(textResult.trim());
    return res.json(parsedJson);

  } catch (error) {
    console.error("Optimize-Prompt generation error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Error optimization." });
  }
});

// 2. Project generation and code generation endpoint
app.post("/api/generate-project", async (req, res) => {
  try {
    const { optimizedPrompt, recommendedPlatform, recommendedSensors, recommendedDisplays, recommendedAlerts, recommendedNetwork, recommendedPower, provider, model } = req.body;
    if (!optimizedPrompt) {
      return res.status(400).json({ error: "optimizedPrompt is required." });
    }

    const allComps = await fetchComponentsFromDb();
    
    // Semantic RAG retrieval: retrieve Top 8 components matching the optimized specification
    const activeComps = await ragEngine.retrieve(optimizedPrompt, allComps, 8);
    
    const componentResolveInput = {
      allComps,
      ragComps: activeComps,
      recommendedSensors,
      recommendedDisplays,
      recommendedAlerts,
      recommendedNetwork,
      recommendedPower,
      optimizedPrompt
    };

    const selectedComps = resolveComponentsFromFullCatalog(componentResolveInput);

    const isSTM32 = (recommendedPlatform || "").toUpperCase().includes("STM32");
    
    // Dynamically pre-allocate pins to ensure 0 collisions
    const allocatedConnections = allocatePins(selectedComps, isSTM32 ? "STM32" : "ESP32");
    const pinAllocationConstraints = allocatedConnections
      .filter(conn => !["3V3", "5V", "GND", "VCC"].includes(conn.fromPin.toUpperCase()))
      .map(conn => `- 元器件 "${conn.toComponent}" 的引脚 "${conn.toPin}" 必须连接到主控的 "${conn.fromPin}"`)
      .join("\n");

    const promptComps = mergeRagAndResolvedComponents(activeComps, selectedComps);

    const activeCompsSpecs = promptComps
      .filter(c => c.active)
      .map(c => {
        let spec = `- ${c.name}: Protocol/Type=${c.type}, PinsUsed=${c.pinsUsed}, Voltage=${c.voltage}, Details=${c.description}`;
        if (c.macroPrefix) {
          spec += `, MacroPrefix=${c.macroPrefix}`;
        }
        if (c.drivers) {
          spec += `\n  * Driver Specs:
    Includes: ${JSON.stringify(c.drivers.includes)}
    Defines: ${JSON.stringify(c.drivers.defines)}
    Instantiation: ${c.drivers.globalInstantiation}
    Setup: ${c.drivers.setupCode}
    API Docs: ${c.drivers.apiDocumentation}`;
        }
        return spec;
      })
      .join("\n");

    const designGuidelines = `
        Enforce these design guidelines:
        1. Pins mapped in "connections" MUST align exactly with pin definitions used inside the compiled files.
        2. You MUST strictly use the following pre-allocated MCU pins for the peripheral signals. Do NOT assign any other pins to these components:
${pinAllocationConstraints || "   (None)"}
        3. Power and Ground connection routing rules:
           - Every peripheral requiring VCC, VDD, VS, or 5V power MUST connect to the MCU's '3V3' or '5V' pins as appropriate based on the peripheral's operating voltage. Never connect a VCC/VDD/VS/5V pin to a GPIO pin (like PA8, PB8, etc.).
           - Every peripheral requiring GND MUST connect to the MCU's 'GND' pin.
        4. For motor drivers like L298N: VS (motor power) MUST connect to '5V', VCC (logic power) MUST connect to '5V', GND to 'GND'. ALL SIX control pins are MANDATORY: IN1 and IN2 (direction A) connect to the pre-allocated GPIO pins, IN3 and IN4 (direction B) connect to the pre-allocated GPIO pins, ENA and ENB connect to the pre-allocated GPIO pins.
        5. Generate highly functional and complete file contents based on the requested platform framework (Arduino C++ for ESP32, and native Standard Peripheral Library for STM32 F103C8). No stubbed/empty functions or placeholders.
        6. For each selected peripheral component, you MUST use the exact driver library specifications, header includes, defines, global variable instantiation templates, and setup initialization blocks as declared in its "Driver Specs". Do not write different class instances or custom init logic.
    `;

    let platformSpecificInstructions = "";
    if (isSTM32) {
      platformSpecificInstructions = `
      Since the selected MCU platform is STM32 (specifically STM32F103C8 Blue Pill), you MUST generate a complete, fully compilable STM32 Standard Peripheral Library (SPL) firmware package.
      
      CRITICAL REQUIREMENTS FOR STM32 SPL PROJECT:
      1. DO NOT USE ARDUINO FRAMEWORK OR ARDUINO HEADERS. There should be NO reference to "<Arduino.h>", "pinMode", "digitalWrite", "delay()", or similar Arduino functions.
      2. Injected Libraries: The backend will automatically inject complete, tested driver files for delay, software I2C OLED, and DHT. 
         You ONLY need to generate:
         - "platformio.ini" at the root, with framework = spl.
         - "user/pins.h": Defines specific pin names mapped to Blue Pill. You MUST STRICTLY define these exact macros if you use the components (otherwise compilation will fail):
           For OLED: OLED_SDA_PIN (e.g. GPIO_Pin_7), OLED_SDA_PORT (e.g. GPIOB), OLED_SDA_CLK (e.g. RCC_APB2Periph_GPIOB), OLED_SCL_PIN (e.g. GPIO_Pin_6), OLED_SCL_PORT (e.g. GPIOB), OLED_SCL_CLK (e.g. RCC_APB2Periph_GPIOB)
           For DHT: DHT_PIN (e.g. GPIO_Pin_0), DHT_GPIO_PORT (e.g. GPIOB), DHT_GPIO_CLK (e.g. RCC_APB2Periph_GPIOB)
           For Buzzer: BUZZER_PIN (e.g. GPIO_Pin_13), BUZZER_GPIO_PORT (e.g. GPIOC), BUZZER_GPIO_CLK (e.g. RCC_APB2Periph_GPIOC)
         - "user/main.c": Contains "int main(void)", calls delay_init(), OLED_Init(), and DHT_ReadData(&temp, &humi) inside the while(1) loop. Do not define oled.c/h or dht.c/h driver functions yourself.
           You MUST put \`#include "delay.h"\` at the top of main.c.
           *IMPORTANT FOR NETWORKING*: If the system requires Wi-Fi or MQTT internet access, you MUST:
             - Wire the ESP8266 Wi-Fi module in the connections. You MUST generate exactly 4 connections for it in the JSON connections array:
               1) from MCU Pin "3V3" to ESP8266 Pin "VCC" (Signal: VCC, Color: "#EF4444")
               2) from MCU Pin "GND" to ESP8266 Pin "GND" (Signal: GND, Color: "#111827")
               3) from MCU Pin "PA3" to ESP8266 Pin "TX" (Signal: UART_RX, Color: "#8B5CF6", Description: "STM32 USART2 RX connects to ESP8266 TX")
               4) from MCU Pin "PA2" to ESP8266 Pin "RX" (Signal: UART_TX, Color: "#EC4899", Description: "STM32 USART2 TX connects to ESP8266 RX")
             - In "user/pins.h", define:
               ESP8266_USART (USART2)
               ESP8266_TX_PIN (GPIO_Pin_2)
               ESP8266_RX_PIN (GPIO_Pin_3)
             - In "user/main.c", write code to initialize USART2 (setting up GPIO PA2/PA3 as alternate function push-pull / input floating, enabling clock for USART2 and GPIOA, configuring baud rate to 115200) and send AT command sequences to ESP8266 over USART2 to establish a Wi-Fi connection and send telemetry via MQTT (e.g., printing functions or simple loop sending "AT+CWJAP..." and "AT+MQTTPUB...").
         - "README.md": Build guide instructions in Chinese.
      3. Standard APIs of Injected Drivers:
         - OLED: void OLED_Init(void); void OLED_Clear(void); void OLED_ShowString(uint8_t x, uint8_t y, const char *str); void OLED_ShowNum(uint8_t x, uint8_t y, uint32_t num, uint8_t len);
         - DHT: uint8_t DHT_ReadData(float *temp, float *humi); (returns 1 on success, 0 on failure)
         - Delay: void delay_init(void); void delay_ms(uint16_t nms); void delay_us(uint32_t nus);
      4. Pin Names in "connections" database MUST match physical Blue Pill STM32 pins: "PA8", "PB12", "PB7", "PB6", "PA2", "PA3", "GND", "3V3" etc. (PB7 for I2C SDA, PB6 for I2C SCL, PB12 for DHT Sensor, PA8 for Active Buzzer, PA2 for ESP8266 TX, PA3 for ESP8266 RX).
      5. ANTI-HALLUCINATION RULES (CRITICAL):
         - NEVER name any of your initialization functions with standard SPL names like "I2C_Init", "USART_Init", "SPI_Init", as this will cause "declaration is incompatible" conflicts with the actual SPL. Always use a prefix like "User_I2C_Init" or "App_USART_Init".
         - The function "delay_ms()" returns VOID. It is a blocking delay. DO NOT treat it like Arduino's millis(). There is no millis() available. If you need non-blocking timing, use blocking delays instead or configure a timer. DO NOT assign delay_ms() to a variable.
         - If you use functions like memset, strstr, or NULL, you MUST #include <string.h> and #include <stddef.h> at the top of the file.
      `;
    } else {
      const esp32Libs = selectedComps.flatMap(c => c.drivers?.platformioLibs || []);
      const esp32LibsList = esp32Libs.length > 0 ? esp32Libs.join("\n  ") : "";

      platformSpecificInstructions = `
      Since the selected MCU platform is ESP32 (or ESP32-based), you MUST generate a complete, fully compilable Arduino C++ firmware package.
      
      CRITICAL REQUIREMENTS FOR ESP32 ARDUINO PROJECT:
      1. MUST use Arduino framework and include "<Arduino.h>".
      2. File Structure: The project files MUST include:
         - "platformio.ini": Standard configuration for ESP32 under Arduino framework. You MUST list these exact libraries in the 'lib_deps' section of platformio.ini:
           ${esp32LibsList || "None required"}
         - "src/main.cpp": The main entry with setup() and loop(). Realistically implement Wi-Fi connectivity, sensor measurement (e.g. Adafruit DHT/SGP30 class drivers), active alarm check, and SSD1306 OLED rendering.
         - "src/pins.h": Definition of GPIO pins mapped to ESP32 (such as SDA=21, SCL=22, BUZZER=23, DHT=15).
         - "README.md": Instruction guide explaining the library dependencies, firmware structure, and flashing commands in Chinese.
      3. Pin Names in "connections" database MUST match ESP32 DevKit pins: "GPIO21", "GPIO22", "GPIO23", "GPIO15", "GND", "3V3" etc.
      `;
    }

    const generatorPrompt = `
      You are an elite IoT firmware engineer and schematic designer. 
      Given the optimized requirements, you must generate a complete, production-ready, fully compilable firmware package and precise electrical wiring mappings.
      
      ${platformSpecificInstructions}`;

    const deepseekProjectSchema = {
      type: "object",
      properties: {
        projectName: { type: "string" },
        scenario: { type: "string" },
        readmeText: { type: "string" },
        files: {
          type: "array",
          items: {
            type: "object",
            properties: {
              path: { type: "string" },
              content: { type: "string" },
              language: { type: "string" }
            },
            required: ["path", "content", "language"]
          }
        },
        connections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              fromPin: { type: "string" },
              toComponent: { type: "string" },
              toPin: { type: "string" },
              signalType: { type: "string" },
              color: { type: "string" },
              description: { type: "string" }
            },
            required: ["fromPin", "toComponent", "toPin", "signalType", "color"]
          }
        }
      },
      required: ["projectName", "scenario", "readmeText", "files", "connections"]
    };

    let parsedJson: any = null;
    let linterRes: { errors: string[], warnings: string[] } | null = null;
    const maxAttempts = 3;

    if (provider === "deepseek" || !hasValidGeminiKey) {
      let attempts = 0;
      let currentPrompt = `
        Requirements:
        - MCU: ${recommendedPlatform || "ESP32"}
        - Sensors: ${recommendedSensors || "None"}
        - Displays: ${recommendedDisplays || "None"}
        - Alerts: ${recommendedAlerts || "None"}
        - Protocol: ${recommendedNetwork || "Offline"}
        - Power: ${recommendedPower || "USB 5V"}
        - Input: ${optimizedPrompt}
        
        Active Hardware Specifications Catalog:
        ${activeCompsSpecs}
        
        ${platformSpecificInstructions}
        
        ${designGuidelines}
        
        Write high quality, fully-complete production-ready fully compilable files and detailed wiring schema (connections).
      `;

      while (attempts < maxAttempts) {
        attempts++;
        console.log(`[Generate Project] Attempt ${attempts}/${maxAttempts} calling DeepSeek...`);
        const textResult = await callDeepSeek(currentPrompt, deepseekProjectSchema, model);
        try {
          parsedJson = JSON.parse(textResult.trim());
          parsedJson.connections = allocatedConnections;
          linterRes = validateProjectHardware(parsedJson.connections || [], recommendedPlatform || "ESP32");
          if (linterRes.errors.length === 0) {
            break; // Valid hardware wiring!
          }
          console.warn(`[Linter Warning] Attempt ${attempts} failed hardware validations:`, linterRes.errors);
          if (attempts < maxAttempts) {
            currentPrompt += `\n\n[FATAL ERROR IN PREVIOUS GENERATION]
The connections/pins schema you generated has fatal hardware errors. Please fix these errors in your next output:
${linterRes.errors.map(err => `- ${err}`).join("\n")}
Ensure you allocate valid, non-conflicting GPIO pins!`;
          }
        } catch (parseErr) {
          console.error(`[Parse Error] Attempt ${attempts} failed to parse JSON:`, parseErr);
          if (attempts < maxAttempts) {
            currentPrompt += `\n\n[FATAL ERROR IN PREVIOUS GENERATION]
Your output was not valid JSON. Please return a raw valid JSON object strictly complying with the schema.`;
          } else {
            throw parseErr;
          }
        }
      }
    } else {
      let attempts = 0;
      const generatorPromptRest = `

        Requirements details:
        MCU: \${recommendedPlatform || "ESP32"}
        Sensors: \${recommendedSensors || "None"}
        Displays: \${recommendedDisplays || "None"}
        Alerts: \${recommendedAlerts || "None"}
        Protocol: \${recommendedNetwork || "Offline"}
        Power: \${recommendedPower || "USB 5V"}
        Details: "\${optimizedPrompt}"

        Active Hardware Specifications Catalog:
        \${activeCompsSpecs}

        \${designGuidelines}
        
        Output structure MUST conform exactly to the response JSON schema requested.
      `;
      let currentPrompt = generatorPrompt + "\n" + generatorPromptRest;

      while (attempts < maxAttempts) {
        attempts++;
        console.log(`[Generate Project] Attempt ${attempts}/${maxAttempts} calling Gemini...`);
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: currentPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                projectName: { type: Type.STRING },
                scenario: { type: Type.STRING },
                readmeText: { type: Type.STRING, description: "A beautiful detailed markdown guide outlining system, code architecture, pins tables and deployment/wiring instructions." },
                files: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      path: { type: Type.STRING, description: "File path (e.g., path/to/file.c, include/delay.h, src/main.c, platformio.ini)" },
                      content: { type: Type.STRING, description: "Complete file content with full logic." },
                      language: { type: Type.STRING, description: "File syntax language, e.g. cpp, c, ini, header, markdown" }
                    },
                    required: ["path", "content", "language"]
                  }
                },
                connections: {
                  type: Type.ARRAY,
                  description: "Actual physical wiring diagram mapping between components.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      fromPin: { type: Type.STRING, description: "Pin on Main MCU (e.g. GPIO21, GPIO22, 3V3, GND, GPIO15, PA8, PB12, PB7, PB6)" },
                      toComponent: { type: Type.STRING, description: "Target component name (e.g. DHT22, OLED 0.96\" I2C, Active Buzzer)" },
                      toPin: { type: Type.STRING, description: "Pin on the target component (e.g. VCC, GND, SDA, SCL, DATA, IN)" },
                      signalType: { type: Type.STRING, description: "VCC, GND, I2C_SDA, I2C_SCL, GPIO, PWM, ADC" },
                      color: { type: Type.STRING, description: "Hexadecimal color starting with #, e.g., #EF4444 (VCC), #111827 (GND), #3B82F6 (blue), #F59E0B (yellow)" },
                      description: { type: Type.STRING, description: "Brief wiring description" }
                    },
                    required: ["fromPin", "toComponent", "toPin", "signalType", "color"]
                  }
                }
              },
              required: ["projectName", "scenario", "readmeText", "files", "connections"]
            }
          }
        });

        const textResult = response.text;
        if (!textResult) {
          throw new Error("Failed to generate project structure from Gemini.");
        }

        try {
          parsedJson = JSON.parse(textResult.trim());
          parsedJson.connections = allocatedConnections;
          linterRes = validateProjectHardware(parsedJson.connections || [], recommendedPlatform || "ESP32");
          if (linterRes.errors.length === 0) {
            break; // Success!
          }
          console.warn(`[Linter Warning] Attempt ${attempts} failed hardware validations:`, linterRes.errors);
          if (attempts < maxAttempts) {
            currentPrompt += `\n\n[FATAL ERROR IN PREVIOUS GENERATION]
The connections/pins schema you generated has fatal hardware errors. Please fix these errors in your next output:
${linterRes.errors.map(err => `- ${err}`).join("\n")}
Ensure you allocate valid, non-conflicting GPIO pins!`;
          }
        } catch (parseErr) {
          console.error(`[Parse Error] Attempt ${attempts} failed to parse JSON:`, parseErr);
          if (attempts < maxAttempts) {
            currentPrompt += `\n\n[FATAL ERROR IN PREVIOUS GENERATION]
Your output was not valid JSON. Please return a raw valid JSON object strictly complying with the schema.`;
          } else {
            throw parseErr;
          }
        }
      }
    }

    if (linterRes && linterRes.errors.length > 0) {
      throw new Error("硬件引脚规则校验未通过，AI重试修正失败，请检查外设引脚配置需求。\n错误详情：\n" + linterRes.errors.map(e => `- ${e}`).join("\n"));
    }

    const missingRequiredComponents = findMissingRequiredComponents(selectedComps, parsedJson.connections || []);
    if (missingRequiredComponents.length > 0) {
      throw new Error(
        "工程硬件清单不完整，系统已阻止返回缺失接线图的工程。\n缺失详情：\n" +
        missingRequiredComponents.map(gap => `- ${gap.reason}`).join("\n")
      );
    }

    // Attach warnings to parsedJson
    if (linterRes) {
      parsedJson.warnings = linterRes.warnings;
      if (linterRes.warnings.length > 0) {
        const warningHeader = `\n## ⚠️ 硬件静态规则校验报告 (Hardware Linter Report)\n\n` + 
          linterRes.warnings.map((w: string) => `- ⚠️ **提示**: ${w}`).join("\n") + 
          `\n\n---\n\n`;

        if (parsedJson.readmeText) {
          parsedJson.readmeText = warningHeader + parsedJson.readmeText;
        } else {
          parsedJson.readmeText = warningHeader;
        }

        if (Array.isArray(parsedJson.files)) {
          const readmeFile = parsedJson.files.find((f: any) => f.path && f.path.toLowerCase() === 'readme.md');
          if (readmeFile) {
            readmeFile.content = warningHeader + readmeFile.content;
          } else {
            parsedJson.files.push({
              path: "README.md",
              content: parsedJson.readmeText,
              language: "markdown"
            });
          }
        }
      }
    }

    postProcessProject(parsedJson, isSTM32, selectedComps);
    return res.json(parsedJson);

  } catch (error) {
    console.error("Project generation error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Error project generation." });
  }
});

// --- LOCAL FILE-BASED DATABASE API ROUTES ---

function checkAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userId = req.headers["x-user-id"] as string;
  if (!userId) {
    return res.status(401).json({ error: "未授权：请先登录。" });
  }
  const users = readDbFile<LocalUser[]>("users.json", []);
  const user = users.find(u => u.userId === userId);
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return res.status(403).json({ error: "权限不足：仅管理员角色有权执行此操作。" });
  }
  next();
}

function getRequestUser(req: express.Request): LocalUser | null {
  const userId = req.headers["x-user-id"] as string;
  if (!userId) return null;
  const users = readDbFile<LocalUser[]>("users.json", []);
  return users.find(u => u.userId === userId) || null;
}

function isTeacherLike(user: LocalUser | null): boolean {
  return !!user && ["teacher", "admin", "superadmin"].includes(user.role);
}

function isAdminLike(user: LocalUser | null): boolean {
  return !!user && ["admin", "superadmin"].includes(user.role);
}

function checkTeacher(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getRequestUser(req);
  if (!user) {
    return res.status(401).json({ error: "未授权：请先登录。" });
  }
  if (!isTeacherLike(user)) {
    return res.status(403).json({ error: "权限不足：仅教师或管理员可以访问班级管理。" });
  }
  next();
}

function canAccessClass(user: LocalUser, classRoom: ClassRoom): boolean {
  return isAdminLike(user) || classRoom.teacherId === user.userId;
}

function getClassJoinCode(classRoom: ClassRoom): string {
  return classRoom.joinCode || `CLASS-${classRoom.classId.slice(-6).toUpperCase()}`;
}

function enrichClassRoom(classRoom: ClassRoom): ClassRoom {
  return {
    ...classRoom,
    joinCode: getClassJoinCode(classRoom),
  };
}

function generateClassJoinCode(classes: ClassRoom[]): string {
  const existingCodes = new Set(classes.map(c => getClassJoinCode(c).toUpperCase()));
  let code = "";
  do {
    code = `CLASS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  } while (existingCodes.has(code));
  return code;
}

function getJoinCodeCandidates(input: unknown): Set<string> {
  const values = new Set<string>();
  const raw = String(input || "").trim();
  if (!raw) return values;

  values.add(raw);
  try {
    const parsedUrl = new URL(raw);
    const urlJoinCode = parsedUrl.searchParams.get("joinClass");
    if (urlJoinCode) values.add(urlJoinCode);
  } catch {
    const match = raw.match(/[?&]joinClass=([^&#]+)/i);
    if (match?.[1]) values.add(decodeURIComponent(match[1]));
  }

  const candidates = new Set<string>();
  values.forEach(value => {
    const normalized = value.trim().toUpperCase();
    if (!normalized) return;
    candidates.add(normalized);
    if (normalized.startsWith("CLASS-")) {
      candidates.add(normalized.slice(6));
    } else {
      candidates.add(`CLASS-${normalized}`);
    }
  });
  return candidates;
}

function enrichClassMember(member: ClassMember, users: LocalUser[]) {
  const user = users.find(u => u.userId === member.userId);
  return {
    ...member,
    displayName: user?.displayName || member.userId,
    username: user?.username || "",
  };
}

function enrichJoinRequest(request: ClassJoinRequest, classes: ClassRoom[], users: LocalUser[]) {
  const classRoom = classes.find(c => c.classId === request.classId);
  const student = users.find(u => u.userId === request.studentId);
  return {
    ...request,
    className: classRoom?.name || request.classId,
    studentName: student?.displayName || request.studentId,
    username: student?.username || request.studentId,
  };
}

function enrichSubmission(submission: LearningSubmission, classes: ClassRoom[], users: LocalUser[]) {
  const student = users.find(u => u.userId === submission.studentId);
  const classRoom = classes.find(c => c.classId === submission.classId);
  return {
    ...submission,
    studentName: student?.displayName || submission.studentId,
    className: classRoom?.name || submission.classId,
  };
}

// --- CLASSROOM AND LEARNING SUBMISSION ROUTES ---

app.get("/api/teacher/classes", checkTeacher, (req, res) => {
  try {
    const user = getRequestUser(req)!;
    const classes = readDbFile<ClassRoom[]>("classes.json", []);
    const visibleClasses = isAdminLike(user)
      ? classes
      : classes.filter(c => c.teacherId === user.userId);
    return res.json(visibleClasses.map(enrichClassRoom));
  } catch (err) {
    console.error("Fetch teacher classes error:", err);
    return res.status(500).json({ error: "获取班级列表失败。" });
  }
});

app.post("/api/teacher/classes", checkTeacher, (req, res) => {
  try {
    const user = getRequestUser(req)!;
    const { name, description, teacherId } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "班级名称不能为空。" });
    }

    const now = new Date().toISOString();
    const classes = readDbFile<ClassRoom[]>("classes.json", []);
    const classRoom: ClassRoom = {
      classId: "class_" + Math.random().toString(36).substring(2, 11),
      name: String(name).trim(),
      teacherId: isAdminLike(user) && teacherId ? String(teacherId) : user.userId,
      joinCode: generateClassJoinCode(classes),
      description: description ? String(description).trim() : "",
      createdAt: now,
      updatedAt: now,
    };

    classes.push(classRoom);
    writeDbFile("classes.json", classes);
    return res.json({ status: "ok", classRoom: enrichClassRoom(classRoom) });
  } catch (err) {
    console.error("Create class error:", err);
    return res.status(500).json({ error: "创建班级失败。" });
  }
});

app.put("/api/teacher/classes/:classId", checkTeacher, (req, res) => {
  try {
    const user = getRequestUser(req)!;
    const { classId } = req.params;
    const { name, description } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "班级名称不能为空。" });
    }

    const classes = readDbFile<ClassRoom[]>("classes.json", []);
    const classIndex = classes.findIndex(c => c.classId === classId);
    const classRoom = classes[classIndex];
    if (!classRoom || !canAccessClass(user, classRoom)) {
      return res.status(404).json({ error: "找不到该班级，或无权访问。" });
    }

    const updatedClass: ClassRoom = {
      ...classRoom,
      name: String(name).trim(),
      description: description ? String(description).trim() : "",
      updatedAt: new Date().toISOString(),
    };
    classes[classIndex] = updatedClass;
    writeDbFile("classes.json", classes);
    return res.json({ status: "ok", classRoom: enrichClassRoom(updatedClass) });
  } catch (err) {
    console.error("Update class error:", err);
    return res.status(500).json({ error: "更新班级失败。" });
  }
});

app.delete("/api/teacher/classes/:classId", checkTeacher, (req, res) => {
  try {
    const user = getRequestUser(req)!;
    const { classId } = req.params;
    const classes = readDbFile<ClassRoom[]>("classes.json", []);
    const classRoom = classes.find(c => c.classId === classId);
    if (!classRoom || !canAccessClass(user, classRoom)) {
      return res.status(404).json({ error: "找不到该班级，或无权访问。" });
    }

    writeDbFile("classes.json", classes.filter(c => c.classId !== classId));
    const members = readDbFile<ClassMember[]>("class_members.json", []);
    writeDbFile("class_members.json", members.filter(m => m.classId !== classId));
    const submissions = readDbFile<LearningSubmission[]>("learning_submissions.json", []);
    writeDbFile("learning_submissions.json", submissions.filter(s => s.classId !== classId));
    const joinRequests = readDbFile<ClassJoinRequest[]>("class_join_requests.json", []);
    writeDbFile("class_join_requests.json", joinRequests.filter(r => r.classId !== classId));
    return res.json({ status: "ok" });
  } catch (err) {
    console.error("Delete class error:", err);
    return res.status(500).json({ error: "删除班级失败。" });
  }
});

app.get("/api/teacher/classes/:classId/members", checkTeacher, (req, res) => {
  try {
    const user = getRequestUser(req)!;
    const { classId } = req.params;
    const classes = readDbFile<ClassRoom[]>("classes.json", []);
    const classRoom = classes.find(c => c.classId === classId);
    if (!classRoom || !canAccessClass(user, classRoom)) {
      return res.status(404).json({ error: "找不到该班级，或无权访问。" });
    }

    const users = readDbFile<LocalUser[]>("users.json", []);
    const members = readDbFile<ClassMember[]>("class_members.json", [])
      .filter(m => m.classId === classId)
      .map(member => enrichClassMember(member, users));
    return res.json(members);
  } catch (err) {
    console.error("Fetch class members error:", err);
    return res.status(500).json({ error: "获取班级成员失败。" });
  }
});

app.get("/api/teacher/classes/:classId/teachers", checkTeacher, (req, res) => {
  try {
    const user = getRequestUser(req)!;
    const { classId } = req.params;
    const classes = readDbFile<ClassRoom[]>("classes.json", []);
    const classRoom = classes.find(c => c.classId === classId);
    if (!classRoom || !canAccessClass(user, classRoom)) {
      return res.status(404).json({ error: "找不到该班级，或无权访问。" });
    }

    const users = readDbFile<LocalUser[]>("users.json", []);
    const creator = users.find(u => u.userId === classRoom.teacherId);
    const team = [{
      classId,
      userId: classRoom.teacherId,
      role: "creator",
      joinedAt: classRoom.createdAt,
      displayName: creator?.displayName || classRoom.teacherId,
      username: creator?.username || classRoom.teacherId,
      department: "智慧产业学院",
    }];
    return res.json(team);
  } catch (err) {
    console.error("Fetch class teachers error:", err);
    return res.status(500).json({ error: "获取教师团队失败。" });
  }
});

app.post("/api/teacher/classes/:classId/members", checkTeacher, (req, res) => {
  try {
    const user = getRequestUser(req)!;
    const { classId } = req.params;
    const { studentIdentifier } = req.body;
    if (!studentIdentifier || !String(studentIdentifier).trim()) {
      return res.status(400).json({ error: "请输入学生用户名或用户 ID。" });
    }

    const classes = readDbFile<ClassRoom[]>("classes.json", []);
    const classRoom = classes.find(c => c.classId === classId);
    if (!classRoom || !canAccessClass(user, classRoom)) {
      return res.status(404).json({ error: "找不到该班级，或无权访问。" });
    }

    const users = readDbFile<LocalUser[]>("users.json", []);
    const normalized = String(studentIdentifier).trim().toLowerCase();
    const student = users.find(u =>
      u.userId.toLowerCase() === normalized ||
      u.username.toLowerCase() === normalized
    );
    if (!student) {
      return res.status(404).json({ error: "找不到该学生账号。" });
    }

    const members = readDbFile<ClassMember[]>("class_members.json", []);
    const existing = members.find(m => m.classId === classId && m.userId === student.userId);
    if (existing) {
      return res.json({ status: "ok", member: enrichClassMember(existing, users) });
    }

    const member: ClassMember = {
      classId,
      userId: student.userId,
      role: "student",
      joinedAt: new Date().toISOString(),
    };
    members.push(member);
    writeDbFile("class_members.json", members);
    return res.json({ status: "ok", member: enrichClassMember(member, users) });
  } catch (err) {
    console.error("Add class member error:", err);
    return res.status(500).json({ error: "添加班级成员失败。" });
  }
});

app.put("/api/teacher/classes/:classId/members/:userId", checkTeacher, (req, res) => {
  try {
    const requestUser = getRequestUser(req)!;
    const { classId, userId } = req.params;
    const { displayName, username } = req.body;
    if (!displayName || !String(displayName).trim()) {
      return res.status(400).json({ error: "Student name cannot be empty." });
    }
    if (!username || !String(username).trim()) {
      return res.status(400).json({ error: "Student username cannot be empty." });
    }

    const classes = readDbFile<ClassRoom[]>("classes.json", []);
    const classRoom = classes.find(c => c.classId === classId);
    if (!classRoom || !canAccessClass(requestUser, classRoom)) {
      return res.status(404).json({ error: "Class not found or access denied." });
    }

    const members = readDbFile<ClassMember[]>("class_members.json", []);
    const member = members.find(m => m.classId === classId && m.userId === userId);
    if (!member) {
      return res.status(404).json({ error: "Student is not in this class." });
    }

    const users = readDbFile<LocalUser[]>("users.json", []);
    const userIndex = users.findIndex(u => u.userId === userId);
    if (userIndex < 0) {
      return res.status(404).json({ error: "Student account not found." });
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    const usernameExists = users.some(u => u.userId !== userId && u.username.toLowerCase() === normalizedUsername);
    if (usernameExists) {
      return res.status(400).json({ error: "Username is already used." });
    }

    users[userIndex] = {
      ...users[userIndex],
      displayName: String(displayName).trim(),
      username: String(username).trim(),
      updatedAt: new Date().toISOString(),
    };
    writeDbFile("users.json", users);
    return res.json({ status: "ok", member: enrichClassMember(member, users) });
  } catch (err) {
    console.error("Update class member error:", err);
    return res.status(500).json({ error: "Failed to update student info." });
  }
});

app.post("/api/teacher/classes/:classId/members/:userId/transfer", checkTeacher, (req, res) => {
  try {
    const user = getRequestUser(req)!;
    const { classId, userId } = req.params;
    const { targetClassId } = req.body;
    if (!targetClassId || targetClassId === classId) {
      return res.status(400).json({ error: "Select a target class." });
    }

    const classes = readDbFile<ClassRoom[]>("classes.json", []);
    const sourceClass = classes.find(c => c.classId === classId);
    const targetClass = classes.find(c => c.classId === targetClassId);
    if (!sourceClass || !targetClass || !canAccessClass(user, sourceClass) || !canAccessClass(user, targetClass)) {
      return res.status(404).json({ error: "Class not found or access denied." });
    }

    const users = readDbFile<LocalUser[]>("users.json", []);
    const student = users.find(u => u.userId === userId);
    if (!student) {
      return res.status(404).json({ error: "Student account not found." });
    }

    const members = readDbFile<ClassMember[]>("class_members.json", []);
    const sourceMember = members.find(m => m.classId === classId && m.userId === userId);
    if (!sourceMember) {
      return res.status(404).json({ error: "Student is not in the source class." });
    }

    const existingTargetMember = members.find(m => m.classId === targetClassId && m.userId === userId);
    const nextMembers = members.filter(m => !(m.classId === classId && m.userId === userId));
    const targetMember = existingTargetMember || {
      ...sourceMember,
      classId: targetClassId,
      joinedAt: new Date().toISOString(),
    };
    if (!existingTargetMember) {
      nextMembers.push(targetMember);
    }
    writeDbFile("class_members.json", nextMembers);
    return res.json({ status: "ok", member: enrichClassMember(targetMember, users) });
  } catch (err) {
    console.error("Transfer class member error:", err);
    return res.status(500).json({ error: "Failed to transfer student." });
  }
});

app.delete("/api/teacher/classes/:classId/members/:userId", checkTeacher, (req, res) => {
  try {
    const user = getRequestUser(req)!;
    const { classId, userId } = req.params;
    const classes = readDbFile<ClassRoom[]>("classes.json", []);
    const classRoom = classes.find(c => c.classId === classId);
    if (!classRoom || !canAccessClass(user, classRoom)) {
      return res.status(404).json({ error: "找不到该班级，或无权访问。" });
    }

    const members = readDbFile<ClassMember[]>("class_members.json", []);
    const nextMembers = members.filter(m => !(m.classId === classId && m.userId === userId));
    if (nextMembers.length === members.length) {
      return res.status(404).json({ error: "该学生不在班级中。" });
    }

    writeDbFile("class_members.json", nextMembers);
    return res.json({ status: "ok" });
  } catch (err) {
    console.error("Remove class member error:", err);
    return res.status(500).json({ error: "移除班级成员失败。" });
  }
});

app.get("/api/teacher/classes/:classId/submissions", checkTeacher, (req, res) => {
  try {
    const user = getRequestUser(req)!;
    const { classId } = req.params;
    const classes = readDbFile<ClassRoom[]>("classes.json", []);
    const classRoom = classes.find(c => c.classId === classId);
    if (!classRoom || !canAccessClass(user, classRoom)) {
      return res.status(404).json({ error: "找不到该班级，或无权访问。" });
    }

    const users = readDbFile<LocalUser[]>("users.json", []);
    const submissions = readDbFile<LearningSubmission[]>("learning_submissions.json", [])
      .filter(s => s.classId === classId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(submission => enrichSubmission(submission, classes, users));
    return res.json(submissions);
  } catch (err) {
    console.error("Fetch class submissions error:", err);
    return res.status(500).json({ error: "获取教学反馈内容失败。" });
  }
});

app.post("/api/teacher/classes/:classId/ai-portrait", checkTeacher, async (req, res) => {
  try {
    const user = getRequestUser(req)!;
    const { classId } = req.params;
    const { studentId } = req.body || {};
    const classes = readDbFile<ClassRoom[]>("classes.json", []);
    const users = readDbFile<LocalUser[]>("users.json", []);
    const classRoom = classes.find(c => c.classId === classId);
    if (!classRoom || !canAccessClass(user, classRoom)) {
      return res.status(404).json({ error: "找不到该班级，或无权访问。" });
    }

    const classSubmissions = readDbFile<LearningSubmission[]>("learning_submissions.json", [])
      .filter(s => s.classId === classId)
      .map(submission => enrichSubmission(submission, classes, users));
    const targetSubmissions = studentId
      ? classSubmissions.filter(submission => submission.studentId === studentId)
      : classSubmissions;
    const studentName = studentId
      ? targetSubmissions[0]?.studentName || users.find(item => item.userId === studentId)?.displayName || studentId
      : "";
    const portrait = await generateLearningPortraitWithAi(
      studentId ? "student" : "class",
      studentId ? `${studentName} 学习过程画像` : `${classRoom.name} 班级学习画像`,
      targetSubmissions
    );

    return res.json({
      status: "ok",
      portrait,
    });
  } catch (err) {
    console.error("Generate learning portrait error:", err);
    return res.status(500).json({ error: "AI 学习画像生成失败。" });
  }
});

app.post("/api/teacher/submissions/:submissionId/feedback", checkTeacher, (req, res) => {
  try {
    const user = getRequestUser(req)!;
    const { submissionId } = req.params;
    const { teacherFeedback, score } = req.body;
    const classes = readDbFile<ClassRoom[]>("classes.json", []);
    const users = readDbFile<LocalUser[]>("users.json", []);
    const submissions = readDbFile<LearningSubmission[]>("learning_submissions.json", []);
    const idx = submissions.findIndex(s => s.submissionId === submissionId);
    if (idx < 0) {
      return res.status(404).json({ error: "找不到该提交记录。" });
    }

    const classRoom = classes.find(c => c.classId === submissions[idx].classId);
    if (!classRoom || !canAccessClass(user, classRoom)) {
      return res.status(403).json({ error: "无权评价该班级的提交内容。" });
    }

    submissions[idx] = {
      ...submissions[idx],
      teacherFeedback: teacherFeedback ? String(teacherFeedback) : "",
      score: score === undefined || score === "" ? undefined : Number(score),
      status: "reviewed",
      updatedAt: new Date().toISOString(),
    };
    writeDbFile("learning_submissions.json", submissions);
    return res.json({
      status: "ok",
      submission: enrichSubmission(submissions[idx], classes, users),
    });
  } catch (err) {
    console.error("Save teacher feedback error:", err);
    return res.status(500).json({ error: "保存教师反馈失败。" });
  }
});

app.get("/api/student/classes", (req, res) => {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ error: "未授权：请先登录。" });
    }

    const classes = readDbFile<ClassRoom[]>("classes.json", []);
    const members = readDbFile<ClassMember[]>("class_members.json", []);
    const joinedClassIds = new Set(members.filter(m => m.userId === user.userId).map(m => m.classId));
    return res.json(classes.filter(c => joinedClassIds.has(c.classId)).map(enrichClassRoom));
  } catch (err) {
    console.error("Fetch student classes error:", err);
    return res.status(500).json({ error: "获取学生班级失败。" });
  }
});

app.post("/api/student/classes/join", (req, res) => {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ error: "未授权：请先登录。" });
    }

    const { joinCode } = req.body;
    const candidates = getJoinCodeCandidates(joinCode);
    if (candidates.size === 0) {
      return res.status(400).json({ error: "请输入班级加入码。" });
    }

    const classes = readDbFile<ClassRoom[]>("classes.json", []);
    const classRoom = classes.find(c => {
      const expectedJoinCode = getClassJoinCode(c).toUpperCase();
      const classId = c.classId.toUpperCase();
      const suffix = c.classId.slice(-6).toUpperCase();
      return (
        candidates.has(expectedJoinCode) ||
        candidates.has(classId) ||
        candidates.has(suffix) ||
        candidates.has(`CLASS-${suffix}`)
      );
    });
    if (!classRoom) {
      return res.status(404).json({ error: "找不到对应班级，请检查加入码。" });
    }

    const members = readDbFile<ClassMember[]>("class_members.json", []);
    const existing = members.find(m => m.classId === classRoom.classId && m.userId === user.userId);
    if (existing) {
      return res.json({ status: "joined", classRoom: enrichClassRoom(classRoom), member: existing });
    }

    const users = readDbFile<LocalUser[]>("users.json", []);
    const requests = readDbFile<ClassJoinRequest[]>("class_join_requests.json", []);
    const existingPending = requests.find(r =>
      r.classId === classRoom.classId &&
      r.studentId === user.userId &&
      r.status === "pending"
    );
    if (existingPending) {
      return res.json({
        status: "pending",
        classRoom: enrichClassRoom(classRoom),
        request: enrichJoinRequest(existingPending, classes, users),
      });
    }

    const now = new Date().toISOString();
    const request: ClassJoinRequest = {
      requestId: "join_" + Math.random().toString(36).substring(2, 11),
      classId: classRoom.classId,
      studentId: user.userId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    requests.push(request);
    writeDbFile("class_join_requests.json", requests);
    return res.json({
      status: "pending",
      classRoom: enrichClassRoom(classRoom),
      request: enrichJoinRequest(request, classes, users),
    });
  } catch (err) {
    console.error("Join class error:", err);
    return res.status(500).json({ error: "加入班级失败。" });
  }
});

app.get("/api/student/class-join-requests", (req, res) => {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized. Please sign in first." });
    }

    const classes = readDbFile<ClassRoom[]>("classes.json", []);
    const users = readDbFile<LocalUser[]>("users.json", []);
    const requests = readDbFile<ClassJoinRequest[]>("class_join_requests.json", [])
      .filter(r => r.studentId === user.userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(request => enrichJoinRequest(request, classes, users));
    return res.json(requests);
  } catch (err) {
    console.error("Fetch student class join requests error:", err);
    return res.status(500).json({ error: "Failed to fetch class join requests." });
  }
});

app.get("/api/teacher/class-join-requests", checkTeacher, (req, res) => {
  try {
    const user = getRequestUser(req)!;
    const classes = readDbFile<ClassRoom[]>("classes.json", []);
    const users = readDbFile<LocalUser[]>("users.json", []);
    const accessibleClassIds = new Set(classes.filter(c => canAccessClass(user, c)).map(c => c.classId));
    const requests = readDbFile<ClassJoinRequest[]>("class_join_requests.json", [])
      .filter(r => accessibleClassIds.has(r.classId) && r.status === "pending")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(request => enrichJoinRequest(request, classes, users));
    return res.json(requests);
  } catch (err) {
    console.error("Fetch teacher class join requests error:", err);
    return res.status(500).json({ error: "Failed to fetch class approval requests." });
  }
});

app.post("/api/teacher/class-join-requests/:requestId/review", checkTeacher, (req, res) => {
  try {
    const user = getRequestUser(req)!;
    const { requestId } = req.params;
    const { decision, message } = req.body;
    if (decision !== "approved" && decision !== "rejected") {
      return res.status(400).json({ error: "Decision must be approved or rejected." });
    }

    const classes = readDbFile<ClassRoom[]>("classes.json", []);
    const users = readDbFile<LocalUser[]>("users.json", []);
    const requests = readDbFile<ClassJoinRequest[]>("class_join_requests.json", []);
    const requestIndex = requests.findIndex(r => r.requestId === requestId);
    const request = requests[requestIndex];
    if (!request) {
      return res.status(404).json({ error: "Class join request not found." });
    }

    const classRoom = classes.find(c => c.classId === request.classId);
    if (!classRoom || !canAccessClass(user, classRoom)) {
      return res.status(403).json({ error: "You cannot review this class join request." });
    }

    const now = new Date().toISOString();
    const updatedRequest: ClassJoinRequest = {
      ...request,
      status: decision,
      message: message ? String(message) : "",
      reviewedBy: user.userId,
      reviewedAt: now,
      updatedAt: now,
    };
    requests[requestIndex] = updatedRequest;
    writeDbFile("class_join_requests.json", requests);

    if (decision === "approved") {
      const members = readDbFile<ClassMember[]>("class_members.json", []);
      const existingMember = members.find(m => m.classId === request.classId && m.userId === request.studentId);
      if (!existingMember) {
        members.push({
          classId: request.classId,
          userId: request.studentId,
          role: "student",
          joinedAt: now,
        });
        writeDbFile("class_members.json", members);
      }
    }

    return res.json({
      status: "ok",
      request: enrichJoinRequest(updatedRequest, classes, users),
    });
  } catch (err) {
    console.error("Review class join request error:", err);
    return res.status(500).json({ error: "Failed to review class join request." });
  }
});

app.post("/api/student/submissions", async (req, res) => {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ error: "未授权：请先登录。" });
    }

    const { classId, projectId, projectName, taskType, title, content, attachments } = req.body;
    if (!classId || !taskType || !title || !content) {
      return res.status(400).json({ error: "提交内容不完整。" });
    }

    const classes = readDbFile<ClassRoom[]>("classes.json", []);
    const members = readDbFile<ClassMember[]>("class_members.json", []);
    let targetClassId = String(classId);
    let classRoom = classes.find(c => c.classId === targetClassId);
    let isMember = members.some(m => m.classId === targetClassId && m.userId === user.userId);
    const joinedClassIds = members.filter(m => m.userId === user.userId).map(m => m.classId);
    const joinedClasses = classes.filter(c => joinedClassIds.includes(c.classId));
    if ((!classRoom || !isMember) && joinedClasses.length === 1) {
      targetClassId = joinedClasses[0].classId;
      classRoom = joinedClasses[0];
      isMember = true;
    }
    if (!classRoom || !isMember) {
      return res.status(403).json({
        error: joinedClasses.length
          ? "当前选择的班级与账号加入的班级不一致，请刷新页面后重新选择班级。"
          : "你尚未加入该班级，不能提交学习任务。",
      });
    }

    const now = new Date().toISOString();
    const submissions = readDbFile<LearningSubmission[]>("learning_submissions.json", []);
    const submission: LearningSubmission = {
      submissionId: "sub_" + Math.random().toString(36).substring(2, 11),
      classId: targetClassId,
      studentId: user.userId,
      projectId: projectId ? String(projectId) : undefined,
      projectName: projectName ? String(projectName) : undefined,
      taskType,
      title: String(title),
      content: String(content),
      attachments: attachments ? String(attachments) : undefined,
      status: "submitted",
      createdAt: now,
      updatedAt: now,
    };

    submissions.push({
      ...submission,
      aiStatus: "pending",
    });
    writeDbFile("learning_submissions.json", submissions);
    const reviewedSubmission = await evaluateAndPersistSubmission(submission.submissionId);
    return res.json({
      status: "ok",
      submission: enrichSubmission(reviewedSubmission || submission, classes, [user]),
    });
  } catch (err) {
    console.error("Create learning submission error:", err);
    return res.status(500).json({ error: "提交学习任务失败。" });
  }
});

app.post("/api/teacher/submissions/:submissionId/ai-review", checkTeacher, async (req, res) => {
  try {
    const user = getRequestUser(req)!;
    const { submissionId } = req.params;
    const classes = readDbFile<ClassRoom[]>("classes.json", []);
    const users = readDbFile<LocalUser[]>("users.json", []);
    const submissions = readDbFile<LearningSubmission[]>("learning_submissions.json", []);
    const submission = submissions.find(s => s.submissionId === submissionId);
    if (!submission) {
      return res.status(404).json({ error: "找不到该提交记录。" });
    }

    const classRoom = classes.find(c => c.classId === submission.classId);
    if (!classRoom || !canAccessClass(user, classRoom)) {
      return res.status(403).json({ error: "无权评价该班级的提交内容。" });
    }

    const reviewedSubmission = await evaluateAndPersistSubmission(submissionId);
    if (!reviewedSubmission) {
      return res.status(404).json({ error: "找不到该提交记录。" });
    }

    return res.json({
      status: "ok",
      submission: enrichSubmission(reviewedSubmission, classes, users),
    });
  } catch (err) {
    console.error("Regenerate AI review error:", err);
    return res.status(500).json({ error: "AI 助教初评生成失败。" });
  }
});

app.get("/api/student/submissions", (req, res) => {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ error: "未授权：请先登录。" });
    }

    const classes = readDbFile<ClassRoom[]>("classes.json", []);
    const submissions = readDbFile<LearningSubmission[]>("learning_submissions.json", [])
      .filter(s => s.studentId === user.userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(submission => enrichSubmission(submission, classes, [user]));
    return res.json(submissions);
  } catch (err) {
    console.error("Fetch student submissions error:", err);
    return res.status(500).json({ error: "获取学习提交记录失败。" });
  }
});

// 1. Local Registration
app.post("/api/auth/register", (req, res) => {
  try {
    const { username, password, displayName, email } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "用户名和密码不能为空。" });
    }
    const users = readDbFile<LocalUser[]>("users.json", []);
    const normalizedUsername = username.toLowerCase().trim();
    const userExists = users.some(u => u.username.toLowerCase() === normalizedUsername);
    if (userExists) {
      return res.status(400).json({ error: "该用户名已被注册。" });
    }
    
    const newUserId = "user_" + Math.random().toString(36).substring(2, 11);
    const newUser: LocalUser = {
      userId: newUserId,
      username: username.trim(),
      email: (email || "").trim(),
      displayName: (displayName || username).trim(),
      passwordHash: hashPassword(password),
      role: username.toLowerCase().includes("admin") ? "admin" : "user", // Auto admin if name contains admin
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    users.push(newUser);
    writeDbFile("users.json", users);
    
    const { passwordHash, ...profile } = newUser;
    return res.json({ status: "ok", user: profile });
  } catch (err) {
    console.error("Local register error:", err);
    return res.status(500).json({ error: "内部服务器错误。" });
  }
});

// 2. Local Login
app.post("/api/auth/login", (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "用户名和密码不能为空。" });
    }
    const users = readDbFile<LocalUser[]>("users.json", []);
    const normalizedUsername = username.toLowerCase().trim();
    const user = users.find(u => u.username.toLowerCase() === normalizedUsername);
    if (!user) {
      return res.status(400).json({ error: "用户名或密码错误。" });
    }
    
    if (user.passwordHash !== hashPassword(password)) {
      return res.status(400).json({ error: "用户名或密码错误。" });
    }
    
    const { passwordHash, ...profile } = user;
    return res.json({ status: "ok", user: profile });
  } catch (err) {
    console.error("Local login error:", err);
    return res.status(500).json({ error: "内部服务器错误。" });
  }
});

// 3. Local Projects Fetch
app.get("/api/projects", (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      return res.status(401).json({ error: "未授权：缺少用户 ID。" });
    }
    const projects = readDbFile<any[]>("projects.json", []);
    const userProjects = projects.filter(p => p.userId === userId);
    return res.json(userProjects);
  } catch (err) {
    console.error("Fetch local projects error:", err);
    return res.status(500).json({ error: "内部服务器错误。" });
  }
});

// 4. Local Project Save
app.post("/api/projects", (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      return res.status(401).json({ error: "未授权：缺少用户 ID。" });
    }
    const project = req.body;
    if (!project || !project.projectId) {
      return res.status(400).json({ error: "无效的项目数据。" });
    }
    
    const projects = readDbFile<any[]>("projects.json", []);
    const idx = projects.findIndex(p => p.projectId === project.projectId);
    
    project.userId = userId;
    project.updatedAt = new Date().toISOString();
    if (idx >= 0) {
      projects[idx] = { ...projects[idx], ...project };
    } else {
      project.createdAt = new Date().toISOString();
      projects.push(project);
    }
    
    writeDbFile("projects.json", projects);
    return res.json({ status: "ok", project });
  } catch (err) {
    console.error("Save local project error:", err);
    return res.status(500).json({ error: "内部服务器错误。" });
  }
});

// 5. Local Project Delete
app.delete("/api/projects/:projectId", (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      return res.status(401).json({ error: "未授权。" });
    }
    const { projectId } = req.params;
    const projects = readDbFile<any[]>("projects.json", []);
    const filtered = projects.filter(p => !(p.projectId === projectId && p.userId === userId));
    writeDbFile("projects.json", filtered);
    return res.json({ status: "ok" });
  } catch (err) {
    console.error("Delete local project error:", err);
    return res.status(500).json({ error: "内部服务器错误。" });
  }
});

// 6. Admin MCUs Manage
app.get("/api/admin/mcus", checkAdmin, async (req, res) => {
  const mcus = await fetchMcusFromDb();
  return res.json(mcus);
});

app.post("/api/admin/mcus", checkAdmin, (req, res) => {
  try {
    const mcu = req.body;
    if (!mcu || !mcu.id) return res.status(400).json({ error: "无效的主控数据。" });
    const mcus = readDbFile<any[]>("mcus.json", DEFAULT_MCUS);
    const idx = mcus.findIndex(m => m.id === mcu.id);
    if (idx >= 0) {
      mcus[idx] = mcu;
    } else {
      mcus.push(mcu);
    }
    writeDbFile("mcus.json", mcus);
    return res.json({ status: "ok", mcu });
  } catch (err) {
    return res.status(500).json({ error: "服务器内部错误。" });
  }
});

app.delete("/api/admin/mcus/:mcuId", checkAdmin, (req, res) => {
  try {
    const { mcuId } = req.params;
    const mcus = readDbFile<any[]>("mcus.json", DEFAULT_MCUS);
    const filtered = mcus.filter(m => m.id !== mcuId);
    writeDbFile("mcus.json", filtered);
    return res.json({ status: "ok" });
  } catch (err) {
    return res.status(500).json({ error: "服务器内部错误。" });
  }
});

// 7. Admin Components Manage
app.get("/api/admin/components", checkAdmin, async (req, res) => {
  const components = await fetchComponentsFromDb();
  return res.json(components);
});

app.post("/api/admin/components", checkAdmin, (req, res) => {
  try {
    const comp = req.body;
    if (!comp || !comp.id) return res.status(400).json({ error: "无效的外设组件数据。" });
    
    const partsDir = path.join(process.cwd(), "parts");
    if (!fs.existsSync(partsDir)) {
      fs.mkdirSync(partsDir, { recursive: true });
    }
    
    const filePath = path.join(partsDir, `${comp.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(comp, null, 2), "utf-8");
    
    // Warm up newly added/updated component embeddings
    fetchComponentsFromDb().then(comps => {
      ragEngine.warmup(comps).catch(err => {
        console.error("[RAG Engine] Warmup error on admin save:", err);
      });
    });
    
    return res.json({ status: "ok", comp });
  } catch (err) {
    console.error("Admin save component error:", err);
    return res.status(500).json({ error: "服务器内部错误。" });
  }
});

app.delete("/api/admin/components/:compId", checkAdmin, (req, res) => {
  try {
    const { compId } = req.params;
    const partsDir = path.join(process.cwd(), "parts");
    const filePath = path.join(partsDir, `${compId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return res.json({ status: "ok" });
  } catch (err) {
    console.error("Admin delete component error:", err);
    return res.status(500).json({ error: "服务器内部错误。" });
  }
});

// 8. Admin Users Manage
app.get("/api/admin/users", checkAdmin, (req, res) => {
  try {
    const users = readDbFile<LocalUser[]>("users.json", []);
    const userProfiles = users.map(({ passwordHash, ...profile }) => profile);
    return res.json(userProfiles);
  } catch (err) {
    return res.status(500).json({ error: "服务器内部错误。" });
  }
});

app.post("/api/admin/users", checkAdmin, (req, res) => {
  try {
    const updatedUser = req.body;
    if (!updatedUser) {
      return res.status(400).json({ error: "无效的用户数据。" });
    }
    const users = readDbFile<LocalUser[]>("users.json", []);
    
    // If it has userId, it's an update
    if (updatedUser.userId) {
      const idx = users.findIndex(u => u.userId === updatedUser.userId);
      if (idx >= 0) {
        const existingUser = users[idx];
        
        // If username is changing, ensure it doesn't collide
        if (updatedUser.username && updatedUser.username.toLowerCase().trim() !== existingUser.username.toLowerCase()) {
          const normalizedUsername = updatedUser.username.toLowerCase().trim();
          const userExists = users.some(u => u.username.toLowerCase() === normalizedUsername);
          if (userExists) {
            return res.status(400).json({ error: "该用户名已被使用。" });
          }
        }

        users[idx] = {
          ...existingUser,
          username: updatedUser.username ? updatedUser.username.trim() : existingUser.username,
          displayName: updatedUser.displayName ? updatedUser.displayName.trim() : existingUser.displayName,
          email: updatedUser.email !== undefined ? updatedUser.email.trim() : existingUser.email,
          role: updatedUser.role || existingUser.role,
          passwordHash: updatedUser.password ? hashPassword(updatedUser.password) : existingUser.passwordHash,
          updatedAt: new Date().toISOString()
        };
        writeDbFile("users.json", users);
        const { passwordHash, ...profile } = users[idx];
        return res.json({ status: "ok", user: profile });
      } else {
        return res.status(404).json({ error: "找不到该用户。" });
      }
    } else {
      // It's a new user creation from admin panel
      if (!updatedUser.username || !updatedUser.password) {
        return res.status(400).json({ error: "用户名和密码不能为空。" });
      }
      const normalizedUsername = updatedUser.username.toLowerCase().trim();
      const userExists = users.some(u => u.username.toLowerCase() === normalizedUsername);
      if (userExists) {
        return res.status(400).json({ error: "该用户名已被注册。" });
      }
      const newUserId = "user_" + Math.random().toString(36).substring(2, 11);
      const newUser: LocalUser = {
        userId: newUserId,
        username: updatedUser.username.trim(),
        email: (updatedUser.email || "").trim(),
        displayName: (updatedUser.displayName || updatedUser.username).trim(),
        passwordHash: hashPassword(updatedUser.password),
        role: updatedUser.role || "user",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      users.push(newUser);
      writeDbFile("users.json", users);
      const { passwordHash, ...profile } = newUser;
      return res.json({ status: "ok", user: profile });
    }
  } catch (err) {
    return res.status(500).json({ error: "服务器内部错误。" });
  }
});

app.delete("/api/admin/users/:userId", checkAdmin, (req, res) => {
  try {
    const { userId } = req.params;
    const users = readDbFile<LocalUser[]>("users.json", []);
    const filtered = users.filter(u => u.userId !== userId);
    writeDbFile("users.json", filtered);
    return res.json({ status: "ok" });
  } catch (err) {
    return res.status(500).json({ error: "服务器内部错误。" });
  }
});

// Serve static frontend / Vite integration
async function setupViteOrStatic() {
  if (!isProductionServer) {
    console.log("Starting in DEVELOPMENT mode with Vite dev server integration...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode serving compiled assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ArchitectAI server running on http://localhost:${PORT}`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error("Vite server launch failed:", err);
});

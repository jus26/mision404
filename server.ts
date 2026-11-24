import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Db, MongoClient, ObjectId } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DB_NAME = 'mision_404';
const GAME_ID = 'mision_404';

interface ChallengeDoc {
  _id?: ObjectId;
  gameId: string;
  order: number;
  title: string;
  question: string;
  options: string[];
  correctOption: number;
  hint: string;
  points: number;
  active: boolean;
  moduleId: 'acceso' | 'matriculas' | 'horarios' | 'aula_virtual' | 'certificados';
  moduleName: string;
  restoredMessage: string;
  incorrectExplanation: string;
}

interface RunDoc {
  _id?: ObjectId;
  gameId: string;
  player: string;
  startedAt: Date;
  finishedAt: Date | null;
  correctAnswers: number;
  hintsUsed: number;
  restoredModules: string[];
  answeredChallenges: string[];
  hintedChallenges: string[];
  durationSeconds: number;
  score: number;
  completed: boolean;
}

const INITIAL_CHALLENGES: Omit<ChallengeDoc, '_id'>[] = [
  {
    gameId: GAME_ID,
    order: 1,
    title: 'Acceso y permiso de solo lectura',
    question:
      'Hay que crear un perfil que consulte información sin cambiarla. ¿Qué permiso necesita?',
    options: [
      'Solo lectura',
      'Control total de administrador',
      'Permiso de edición y borrado',
      'Acceso libre sin identificación',
    ],
    correctOption: 0,
    hint: 'Piensa en qué nivel de acceso permite visualizar datos sin riesgo de alterarlos o borrarlos.',
    points: 100,
    active: true,
    moduleId: 'acceso',
    moduleName: 'Acceso',
    restoredMessage:
      'La puerta digital de la academia vuelve a abrirse con perfiles bien protegidos. El alumnado y el equipo ya pueden consultar información en modo seguro sin modificar registros.',
    incorrectExplanation:
      'Para consultar información sin riesgo de alterarla se asigna un permiso de solo lectura.',
  },
  {
    gameId: GAME_ID,
    order: 2,
    title: 'Matrículas e identificador único',
    question:
      'Queremos localizar la matrícula de Ana sin confundirla con otra persona. ¿Qué dato necesitamos?',
    options: [
      'Solo su nombre de pila',
      'Un identificador único',
      'Su aula favorita',
      'La fecha de inicio del trimestre',
    ],
    correctOption: 1,
    hint: 'Puede haber varias personas llamadas Ana; necesitas un código que no se repita jamás.',
    points: 100,
    active: true,
    moduleId: 'matriculas',
    moduleName: 'Matrículas',
    restoredMessage:
      'El listado oficial del alumnado inscrito ha quedado restablecido sin duplicados. Cada expediente responde ahora a un identificador único que evita confusiones entre estudiantes.',
    incorrectExplanation:
      'Cuando dos personas comparten nombre, solo un identificador único permite distinguir cada matrícula con exactitud.',
  },
  {
    gameId: GAME_ID,
    order: 3,
    title: 'Horarios y necesidad de día y hora',
    question:
      'Las clases se repiten cada semana. ¿Qué dato es imprescindible junto a la asignatura?',
    options: [
      'El número de páginas del manual',
      'El color de la pizarra',
      'Día y hora',
      'La altura del edificio',
    ],
    correctOption: 2,
    hint: 'Sin saber la jornada ni el momento exacto de comienzo, nadie sabrá cuándo conectarse o acudir.',
    points: 100,
    active: true,
    moduleId: 'horarios',
    moduleName: 'Horarios',
    restoredMessage:
      'El calendario semanal de la academia vuelve a mostrarse ordenado en el panel. Cada asignatura queda emparejada con su día y hora para que no haya solapamientos.',
    incorrectExplanation:
      'Para organizar clases semanales es imprescindible registrar el día y la hora junto a cada asignatura.',
  },
  {
    gameId: GAME_ID,
    order: 4,
    title: 'Aula virtual y mensaje de phishing',
    question:
      'Llega un mensaje urgente que pide la contraseña mediante un enlace. ¿Qué hacemos?',
    options: [
      'Escribir la contraseña cuanto antes',
      'Reenviar el mensaje a todo el grupo',
      'No abrirlo y verificar el origen',
      'Responder al correo con nuestro usuario',
    ],
    correctOption: 2,
    hint: 'Los avisos urgentes que piden credenciales por un enlace suelen ser intentos de suplantación (phishing).',
    points: 100,
    active: true,
    moduleId: 'aula_virtual',
    moduleName: 'Aula virtual',
    restoredMessage:
      'El enlace sospechoso ha quedado bloqueado antes de poner en peligro ninguna cuenta. El aula virtual vuelve a estar operativa con sesiones seguras para todo el grupo.',
    incorrectExplanation:
      'Ante un mensaje urgente que pide contraseñas mediante un enlace, nunca debe abrirse y siempre hay que verificar el origen oficial.',
  },
  {
    gameId: GAME_ID,
    order: 5,
    title: 'Certificados y código único verificable',
    question:
      '¿Cómo comprobamos que un certificado corresponde a un curso terminado?',
    options: [
      'Observando el tamaño de la fuente',
      'Con un código único verificable',
      'Comprobando si está impreso en color',
      'Contando las líneas del documento',
    ],
    correctOption: 1,
    hint: 'Necesitas una referencia registrada que cualquier persona pueda validar contra la base oficial.',
    points: 100,
    active: true,
    moduleId: 'certificados',
    moduleName: 'Certificados',
    restoredMessage:
      'El sistema de emisión y validación de diplomas ya genera códigos únicos verificables. La Academia 404 recupera su funcionamiento completo con el panel al cien por cien.',
    incorrectExplanation:
      'Un certificado auténtico se comprueba mediante un código único verificable asociado al curso completado.',
  },
];

let mongoClient: MongoClient | null = null;
let connectPromise: Promise<Db> | null = null;
let seeded = false;
let seedPromise: Promise<void> | null = null;

function sanitizeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'Error de conexión desconocido';
  // Never expose MongoDB URI, host credentials, usernames, or passwords
  return raw
    .replace(/mongodb(\+srv)?:\/\/[^\s"'`]+/gi, 'mongodb+srv://[redacted]')
    .replace(/\/\/[^:@\s]+:[^@\s]+@/g, '//[redacted]@');
}

async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error('MONGODB_URI_MISSING');
  }

  if (mongoClient) {
    try {
      const db = mongoClient.db(DB_NAME);
      await db.command({ ping: 1 });
      return db;
    } catch {
      try {
        await mongoClient.close();
      } catch {
        // ignore close errors
      }
      mongoClient = null;
      connectPromise = null;
      seeded = false;
    }
  }

  if (!connectPromise) {
    connectPromise = (async () => {
      const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      await client.connect();
      const db = client.db(DB_NAME);
      await db.command({ ping: 1 });
      mongoClient = client;
      return db;
    })().catch((err) => {
      connectPromise = null;
      mongoClient = null;
      throw err;
    });
  }

  return connectPromise;
}

async function ensureSeeded(db: Db): Promise<void> {
  if (seeded) return;
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    const challengesCol = db.collection<ChallengeDoc>('challenges');
    const existingCount = await challengesCol.countDocuments({ gameId: GAME_ID });

    if (existingCount === 0) {
      await challengesCol.bulkWrite(
        INITIAL_CHALLENGES.map((doc) => ({
          updateOne: {
            filter: { gameId: doc.gameId, order: doc.order },
            update: { $setOnInsert: doc },
            upsert: true,
          },
        })),
        { ordered: true },
      );
    }

    seeded = true;
  })().finally(() => {
    seedPromise = null;
  });

  return seedPromise;
}

function handleMongoUnavailable(err: unknown, res: Response) {
  const rawMsg = err instanceof Error ? err.message : '';
  if (rawMsg === 'MONGODB_URI_MISSING') {
    return res.status(503).json({
      error: 'MongoDB desconectado. Configura la variable privada MONGODB_URI en el entorno.',
    });
  }

  const safeMsg = sanitizeErrorMessage(err);
  console.error('[MongoDB error]:', safeMsg);
  return res.status(503).json({
    error: `MongoDB desconectado (${safeMsg}). Revisa MONGODB_URI y el acceso de red en Atlas.`,
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', async (_req: Request, res: Response) => {
    try {
      const db = await getDb();
      await ensureSeeded(db);
      return res.json({
        server: 'ok',
        mongodb: 'connected',
      });
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : '';
      const message =
        rawMsg === 'MONGODB_URI_MISSING'
          ? 'Falta la variable privada MONGODB_URI en el entorno del servidor.'
          : sanitizeErrorMessage(err);

      return res.status(503).json({
        server: 'ok',
        mongodb: 'disconnected',
        message,
      });
    }
  });

  app.get('/api/challenges', async (_req: Request, res: Response) => {
    try {
      const db = await getDb();
      await ensureSeeded(db);

      const challengesCol = db.collection<ChallengeDoc>('challenges');
      const docs = await challengesCol
        .find(
          { gameId: GAME_ID, active: true },
          {
            projection: {
              _id: 1,
              order: 1,
              title: 1,
              question: 1,
              options: 1,
              points: 1,
              moduleId: 1,
              moduleName: 1,
            },
          },
        )
        .sort({ order: 1 })
        .toArray();

      return res.json(
        docs.map((doc) => ({
          _id: String(doc._id),
          order: doc.order,
          title: doc.title,
          question: doc.question,
          options: doc.options,
          points: doc.points,
          moduleId: doc.moduleId,
          moduleName: doc.moduleName,
        })),
      );
    } catch (err) {
      return handleMongoUnavailable(err, res);
    }
  });

  app.post('/api/runs/start', async (req: Request, res: Response) => {
    try {
      const rawPlayer = req.body?.player;
      if (typeof rawPlayer !== 'string') {
        return res.status(400).json({
          error: 'El alias debe tener entre 2 y 20 caracteres.',
        });
      }

      const player = rawPlayer.trim().replace(/\s+/g, ' ');
      if (player.length < 2 || player.length > 20) {
        return res.status(400).json({
          error: 'El alias debe tener entre 2 y 20 caracteres.',
        });
      }

      const db = await getDb();
      await ensureSeeded(db);
      const runsCol = db.collection<RunDoc>('runs');

      const startedAt = new Date();
      const newRun: Omit<RunDoc, '_id'> = {
        gameId: GAME_ID,
        player,
        startedAt,
        finishedAt: null,
        correctAnswers: 0,
        hintsUsed: 0,
        restoredModules: [],
        answeredChallenges: [],
        hintedChallenges: [],
        durationSeconds: 0,
        score: 0,
        completed: false,
      };

      const insertResult = await runsCol.insertOne(newRun);

      return res.status(201).json({
        runId: String(insertResult.insertedId),
        player,
        startedAt: startedAt.toISOString(),
        score: 0,
        correctAnswers: 0,
        hintsUsed: 0,
        restoredModules: [],
      });
    } catch (err) {
      return handleMongoUnavailable(err, res);
    }
  });

  app.post('/api/runs/hint', async (req: Request, res: Response) => {
    try {
      const { runId, challengeId } = req.body ?? {};
      if (typeof runId !== 'string' || !ObjectId.isValid(runId)) {
        return res.status(400).json({ error: 'Identificador de partida no válido.' });
      }
      if (typeof challengeId !== 'string' || !ObjectId.isValid(challengeId)) {
        return res.status(400).json({ error: 'Identificador de misión no válido.' });
      }

      const db = await getDb();
      const runsCol = db.collection<RunDoc>('runs');
      const challengesCol = db.collection<ChallengeDoc>('challenges');

      const runObjectId = new ObjectId(runId);
      const challengeObjectId = new ObjectId(challengeId);

      const [run, challenge] = await Promise.all([
        runsCol.findOne({ _id: runObjectId }),
        challengesCol.findOne({ _id: challengeObjectId, gameId: GAME_ID, active: true }),
      ]);

      if (!run) {
        return res.status(404).json({ error: 'No se encontró la partida indicada.' });
      }
      if (run.completed) {
        return res.status(400).json({ error: 'Una partida terminada no admite más pistas.' });
      }
      if (!challenge) {
        return res.status(404).json({ error: 'No se encontró la misión indicada.' });
      }

      if (run.hintedChallenges.includes(challengeId)) {
        return res.json({
          hint: challenge.hint,
          hintsUsed: run.hintsUsed,
          score: run.score,
          alreadyUsed: true,
        });
      }

      const nextScore = Math.max(0, run.score - 25);
      const nextHintsUsed = run.hintsUsed + 1;

      const updateResult = await runsCol.findOneAndUpdate(
        {
          _id: runObjectId,
          completed: false,
          hintedChallenges: { $ne: challengeId },
        },
        {
          $push: { hintedChallenges: challengeId },
          $set: { score: nextScore, hintsUsed: nextHintsUsed },
        },
        { returnDocument: 'after' },
      );

      const finalRun = updateResult ?? (await runsCol.findOne({ _id: runObjectId }));
      return res.json({
        hint: challenge.hint,
        hintsUsed: finalRun?.hintsUsed ?? nextHintsUsed,
        score: finalRun?.score ?? nextScore,
        alreadyUsed: false,
      });
    } catch (err) {
      return handleMongoUnavailable(err, res);
    }
  });

  app.post('/api/runs/answer', async (req: Request, res: Response) => {
    try {
      const { runId, challengeId, selectedOption } = req.body ?? {};
      if (typeof runId !== 'string' || !ObjectId.isValid(runId)) {
        return res.status(400).json({ error: 'Identificador de partida no válido.' });
      }
      if (typeof challengeId !== 'string' || !ObjectId.isValid(challengeId)) {
        return res.status(400).json({ error: 'Identificador de misión no válido.' });
      }
      if (
        typeof selectedOption !== 'number' ||
        !Number.isInteger(selectedOption) ||
        selectedOption < 0
      ) {
        return res.status(400).json({ error: 'Opción seleccionada no válida.' });
      }

      const db = await getDb();
      const runsCol = db.collection<RunDoc>('runs');
      const challengesCol = db.collection<ChallengeDoc>('challenges');

      const runObjectId = new ObjectId(runId);
      const challengeObjectId = new ObjectId(challengeId);

      const [run, challenge] = await Promise.all([
        runsCol.findOne({ _id: runObjectId }),
        challengesCol.findOne({ _id: challengeObjectId, gameId: GAME_ID, active: true }),
      ]);

      if (!run) {
        return res.status(404).json({ error: 'No se encontró la partida indicada.' });
      }
      if (run.completed) {
        return res.status(400).json({
          error: 'Una partida terminada no admite más respuestas.',
        });
      }
      if (!challenge) {
        return res.status(404).json({ error: 'No se encontró la misión indicada.' });
      }
      if (selectedOption >= challenge.options.length) {
        return res.status(400).json({ error: 'Opción fuera de rango para esta misión.' });
      }
      if (run.answeredChallenges.includes(challengeId)) {
        return res.status(409).json({
          error: 'Esta misión ya fue respondida en esta partida.',
        });
      }

      const isCorrect = selectedOption === challenge.correctOption;
      const pointsAwarded = isCorrect ? challenge.points || 100 : 0;
      const nextScore = Math.max(0, run.score + pointsAwarded);
      const nextCorrectAnswers = run.correctAnswers + (isCorrect ? 1 : 0);

      const updateOp: any = {
        $push: { answeredChallenges: challengeId },
        $set: {
          score: nextScore,
          correctAnswers: nextCorrectAnswers,
        },
      };

      if (isCorrect) {
        updateOp.$addToSet = { restoredModules: challenge.moduleId };
      }

      const updated = await runsCol.findOneAndUpdate(
        {
          _id: runObjectId,
          completed: false,
          answeredChallenges: { $ne: challengeId },
        },
        updateOp,
        { returnDocument: 'after' },
      );

      if (!updated) {
        return res.status(409).json({
          error: 'Esta misión ya fue respondida o la partida ha finalizado.',
        });
      }

      if (isCorrect) {
        return res.json({
          correct: true,
          score: updated.score,
          correctAnswers: updated.correctAnswers,
          hintsUsed: updated.hintsUsed,
          restoredModules: updated.restoredModules,
          moduleId: challenge.moduleId,
          moduleName: challenge.moduleName,
          restoredMessage: challenge.restoredMessage,
        });
      }

      return res.json({
        correct: false,
        score: updated.score,
        correctAnswers: updated.correctAnswers,
        hintsUsed: updated.hintsUsed,
        restoredModules: updated.restoredModules,
        moduleId: challenge.moduleId,
        moduleName: challenge.moduleName,
        explanation: challenge.incorrectExplanation,
      });
    } catch (err) {
      return handleMongoUnavailable(err, res);
    }
  });

  app.post('/api/runs/finish', async (req: Request, res: Response) => {
    try {
      const { runId } = req.body ?? {};
      if (typeof runId !== 'string' || !ObjectId.isValid(runId)) {
        return res.status(400).json({ error: 'Identificador de partida no válido.' });
      }

      const db = await getDb();
      const runsCol = db.collection<RunDoc>('runs');
      const runObjectId = new ObjectId(runId);

      const existing = await runsCol.findOne({ _id: runObjectId });
      if (!existing) {
        return res.status(404).json({ error: 'No se encontró la partida indicada.' });
      }

      if (existing.completed && existing.finishedAt) {
        return res.json({
          player: existing.player,
          correctAnswers: existing.correctAnswers,
          hintsUsed: existing.hintsUsed,
          restoredModules: existing.restoredModules,
          durationSeconds: existing.durationSeconds,
          score: existing.score,
          startedAt: existing.startedAt.toISOString(),
          finishedAt: existing.finishedAt.toISOString(),
          completed: true,
        });
      }

      const finishedAt = new Date();
      const durationSeconds = Math.max(
        1,
        Math.round((finishedAt.getTime() - existing.startedAt.getTime()) / 1000),
      );
      const safeScore = Math.max(0, existing.score);

      const updated = await runsCol.findOneAndUpdate(
        { _id: runObjectId, completed: false },
        {
          $set: {
            finishedAt,
            durationSeconds,
            score: safeScore,
            completed: true,
          },
        },
        { returnDocument: 'after' },
      );

      const finalDoc = updated ?? (await runsCol.findOne({ _id: runObjectId }));
      if (!finalDoc) {
        return res.status(404).json({ error: 'No se pudo finalizar la partida.' });
      }

      return res.json({
        player: finalDoc.player,
        correctAnswers: finalDoc.correctAnswers,
        hintsUsed: finalDoc.hintsUsed,
        restoredModules: finalDoc.restoredModules,
        durationSeconds: finalDoc.durationSeconds,
        score: finalDoc.score,
        startedAt: finalDoc.startedAt.toISOString(),
        finishedAt: (finalDoc.finishedAt ?? finishedAt).toISOString(),
        completed: true,
      });
    } catch (err) {
      return handleMongoUnavailable(err, res);
    }
  });

  app.get('/api/leaderboard', async (_req: Request, res: Response) => {
    try {
      const db = await getDb();
      const runsCol = db.collection<RunDoc>('runs');

      const topRuns = await runsCol
        .find(
          { gameId: GAME_ID, completed: true },
          {
            projection: {
              _id: 0,
              player: 1,
              score: 1,
              correctAnswers: 1,
              hintsUsed: 1,
              durationSeconds: 1,
              restoredModules: 1,
              finishedAt: 1,
            },
          },
        )
        .sort({ score: -1, durationSeconds: 1, finishedAt: 1 })
        .limit(10)
        .toArray();

      return res.json(
        topRuns.map((r) => ({
          player: r.player,
          score: r.score,
          correctAnswers: r.correctAnswers,
          hintsUsed: r.hintsUsed,
          durationSeconds: r.durationSeconds,
          restoredModules: Array.isArray(r.restoredModules) ? r.restoredModules : [],
          finishedAt: r.finishedAt ? new Date(r.finishedAt).toISOString() : '',
        })),
      );
    } catch (err) {
      return handleMongoUnavailable(err, res);
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Misión 404 server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', sanitizeErrorMessage(err));
  process.exit(1);
});

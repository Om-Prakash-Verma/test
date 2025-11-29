import * as functions from 'firebase-functions';
import { adminDb } from '../../services/firebase-admin';
import { runOptimization, runPreflightDiagnostics, applyNaturalLanguageCommand } from '../../core/schedulerEngine';
import { compareTimetablesWithGemini } from '../../core/analyticsEngine';
import { DAYS_OF_WEEK } from '../../constants';
import type { Batch, Constraints, Faculty, FacultyAllocation, GeneratedTimetable, GlobalConstraints, Room, Subject, TimetableSettings } from '../../types';

const fetchCollection = async (collectionName: string) => {
    const snapshot = await adminDb.collection(collectionName).get();
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
};

export const runScheduler = functions.https.onCall(async (data, context) => {
    const { batchIds, baseTimetable } = data;

    const batchesForScheduler = (await fetchCollection('batches')).filter(b => batchIds.includes(b.id)) as Batch[];
    const allSubjects = await fetchCollection('subjects') as Subject[];
    const allFaculty = await fetchCollection('faculty') as Faculty[];
    const allRooms = await fetchCollection('rooms') as Room[];
    const approvedTimetables = (await fetchCollection('generated_timetables')).filter(t => t.status === 'Approved') as GeneratedTimetable[];
    const constraints = (await adminDb.doc('constraints/main').get()).data() as Constraints;
    const facultyAllocations = await fetchCollection('faculty_allocations') as FacultyAllocation[];
    const globalConstraints = (await adminDb.doc('global_constraints/main').get()).data() as GlobalConstraints;
    const timetableSettings = (await adminDb.doc('timetable_settings/main').get()).data() as TimetableSettings;

    const workingDaysStrings = (timetableSettings.workingDays || [0, 1, 2, 3, 4, 5]).map(i => DAYS_OF_WEEK[i]);

    const dbData = {
        batches: batchesForScheduler,
        allSubjects,
        allFaculty,
        allRooms,
        approvedTimetables,
        constraints,
        facultyAllocations,
        globalConstraints,
        timetableSettings,
        days: workingDaysStrings,
        workingDaysIndices: timetableSettings.workingDays || [0, 1, 2, 3, 4, 5],
        candidateCount: 5,
        baseTimetable,
    };

    const candidates = await runOptimization(dbData);
    const results = candidates.map((candidate, index) => ({
        id: `tt_cand_${batchIds.join('_')}_${Date.now()}_${index}`,
        batchIds, version: 1, status: 'Draft' as const, comments: [],
        createdAt: new Date(),
        metrics: candidate.metrics, timetable: candidate.timetable,
    }));

    return results;
});

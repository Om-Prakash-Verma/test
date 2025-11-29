import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, getDoc, query, where, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './firebase'; // Assuming you have firebase initialized and exported from here
import type { User, Subject, Faculty, Room, Batch, Department, PinnedAssignment, PlannedLeave, FacultyAvailability, GeneratedTimetable, GlobalConstraints, TimetableFeedback, TimetableSettings, Constraints, Substitution, DiagnosticIssue, TimetableGrid, AnalyticsReport, FacultyAllocation, RankedSubstitute } from '../types';

const apiFetch = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : {};
};

const getCollection = async <T>(collectionName: string): Promise<T[]> => {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
};

// --- AUTH ---
export const login = async (email: string): Promise<User> => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        throw new Error('User not found');
    }
    const userDoc = querySnapshot.docs[0];
    return { ...userDoc.data(), id: userDoc.id } as User;
};

// --- GRANULAR DATA FETCHING ---
export const getSubjects = (): Promise<Subject[]> => getCollection<Subject>('subjects');
export const getFaculty = (): Promise<Faculty[]> => getCollection<Faculty>('faculty');
export const getRooms = (): Promise<Room[]> => getCollection<Room>('rooms');
export const getDepartments = (): Promise<Department[]> => getCollection<Department>('departments');
export const getBatches = (): Promise<Batch[]> => getCollection<Batch>('batches');
export const getUsers = (): Promise<User[]> => getCollection<User>('users');
export const getTimetables = (): Promise<GeneratedTimetable[]> => getCollection<GeneratedTimetable>('generated_timetables');
export const getFacultyAllocations = (): Promise<FacultyAllocation[]> => getCollection<FacultyAllocation>('faculty_allocations');

export const getConstraints = async (): Promise<Constraints> => {
    const docRef = doc(db, 'constraints', 'main');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as Constraints : {} as Constraints;
};

export const getSettings = async (): Promise<{ globalConstraints: GlobalConstraints, timetableSettings: TimetableSettings}> => {
    const globalConstraintsSnap = await getDoc(doc(db, 'global_constraints', 'main'));
    const timetableSettingsSnap = await getDoc(doc(db, 'timetable_settings', 'main'));

    return {
        globalConstraints: globalConstraintsSnap.exists() ? globalConstraintsSnap.data() as GlobalConstraints : {} as GlobalConstraints,
        timetableSettings: timetableSettingsSnap.exists() ? timetableSettingsSnap.data() as TimetableSettings : {} as TimetableSettings,
    };
};

// --- SCHEDULER (Kept as API fetch, assuming complex backend logic) ---
export const runScheduler = (batchIds: string[], baseTimetable?: TimetableGrid): Promise<GeneratedTimetable[]> => {
    return apiFetch('/api/scheduler', {
        method: 'POST',
        body: JSON.stringify({ batchIds, baseTimetable }),
    });
};

export const runDiagnostics = (batchIds: string[]): Promise<DiagnosticIssue[]> => {
    return apiFetch('/api/scheduler/diagnostics', {
        method: 'POST',
        body: JSON.stringify({ batchIds }),
    });
};

export const applyNLC = (timetable: TimetableGrid, command: string): Promise<TimetableGrid> => {
     return apiFetch('/api/scheduler/nlc', {
        method: 'POST',
        body: JSON.stringify({ timetable, command }),
    });
};

export const compareTimetables = (candidate1: GeneratedTimetable, candidate2: GeneratedTimetable): Promise<{ analysis: string }> => {
    return apiFetch('/api/scheduler/compare', {
        method: 'POST',
        body: JSON.stringify({ candidate1, candidate2 }),
    });
};

// --- ANALYTICS (Kept as API fetch) ---
export const getAnalyticsReport = (timetableId: string): Promise<AnalyticsReport> => {
    return apiFetch(`/api/analytics/report/${timetableId}`);
};


// --- TIMETABLE MANAGEMENT ---
export const saveTimetable = async (timetable: GeneratedTimetable): Promise<GeneratedTimetable> => {
    const { id, ...data } = timetable;
    const docRef = doc(db, 'generated_timetables', id);
    await setDoc(docRef, data);
    return timetable;
};

export const updateTimetable = (updatedTimetable: GeneratedTimetable): Promise<GeneratedTimetable> => {
    return saveTimetable(updatedTimetable);
};

export const deleteTimetable = async (id: string): Promise<{ success: boolean }> => {
    await deleteDoc(doc(db, 'generated_timetables', id));
    return { success: true };
};

export const saveTimetableFeedback = async (feedback: Omit<TimetableFeedback, 'id' | 'createdAt'>): Promise<TimetableFeedback> => {
    const docRef = await addDoc(collection(db, 'timetable_feedback'), { ...feedback, createdAt: new Date() });
    return { ...feedback, id: docRef.id, createdAt: new Date().toISOString() } as TimetableFeedback; // Approximation
};

// --- CRUD OPERATIONS ---
type HasId = { id: string };
const saveItem = async <T extends HasId>(collectionName: string, item: T): Promise<T> => {
    const { id, ...data } = item;
    await setDoc(doc(db, collectionName, id), data);
    return item;
};

const deleteItem = async (collectionName: string, id: string): Promise<void> => {
    await deleteDoc(doc(db, collectionName, id));
};

export const saveSubject = (item: Subject) => saveItem<Subject>('subjects', item);
export const deleteSubject = (id: string) => deleteItem('subjects', id);

export const saveFaculty = (item: Faculty) => saveItem<Faculty>('faculty', item);
export const deleteFaculty = (id: string) => deleteItem('faculty', id);

export const saveRoom = (item: Room) => saveItem<Room>('rooms', item);
export const deleteRoom = (id: string) => deleteItem('rooms', id);

export const saveBatch = (item: Batch) => saveItem<Batch>('batches', item);
export const deleteBatch = (id: string) => deleteItem('batches', id);

export const saveDepartment = (item: Department) => saveItem<Department>('departments', item);
export const deleteDepartment = (id: string) => deleteItem('departments', id);

export const saveUser = (item: User) => saveItem<User>('users', item);
export const deleteUser = (id: string) => deleteItem('users', id);

// --- CONSTRAINTS ---
const constraintsDocRef = doc(db, 'constraints', 'main');

export const savePinnedAssignment = async (item: PinnedAssignment): Promise<PinnedAssignment> => {
    await updateDoc(constraintsDocRef, { pinnedAssignments: arrayUnion(item) });
    return item;
};

export const deletePinnedAssignment = async (item: PinnedAssignment): Promise<void> => {
    await updateDoc(constraintsDocRef, { pinnedAssignments: arrayRemove(item) });
};

export const savePlannedLeave = async (item: PlannedLeave): Promise<PlannedLeave> => {
    await updateDoc(constraintsDocRef, { plannedLeaves: arrayUnion(item) });
    return item;
};

export const deletePlannedLeave = async (item: PlannedLeave): Promise<void> => {
    await updateDoc(constraintsDocRef, { plannedLeaves: arrayRemove(item) });
};

export const saveFacultyAvailability = async (data: FacultyAvailability): Promise<FacultyAvailability> => {
    const docSnap = await getDoc(constraintsDocRef);
    const constraints = docSnap.exists() ? docSnap.data() as Constraints : { facultyAvailability: [] };
    const existingIndex = constraints.facultyAvailability?.findIndex(fa => fa.facultyId === data.facultyId) ?? -1;
    
    let updatedAvailability: FacultyAvailability[];
    if (existingIndex > -1) {
        updatedAvailability = [...(constraints.facultyAvailability || [])];
        updatedAvailability[existingIndex] = data;
    } else {
        updatedAvailability = [...(constraints.facultyAvailability || []), data];
    }

    await updateDoc(constraintsDocRef, { facultyAvailability: updatedAvailability });
    return data;
};

// --- SUBSTITUTIONS (Kept as API fetch) ---
export const findSubstitutes = (assignmentId: string, currentTimetableGrid: TimetableGrid): Promise<RankedSubstitute[]> => {
    return apiFetch('/api/substitutes/find', {
        method: 'POST',
        body: JSON.stringify({ assignmentId, currentTimetableGrid }),
    });
};

export const createSubstitution = (substitution: Omit<Substitution, 'id'>): Promise<Substitution> => {
    return apiFetch('/api/substitutes', {
        method: 'POST',
        body: JSON.stringify(substitution),
    });
};


// --- SETTINGS ---
export const saveGlobalConstraints = (newGlobalConstraints: GlobalConstraints): Promise<GlobalConstraints> => {
    return setDoc(doc(db, 'global_constraints', 'main'), newGlobalConstraints).then(() => newGlobalConstraints);
}

export const saveTimetableSettings = (newTimetableSettings: TimetableSettings): Promise<TimetableSettings> => {
    return setDoc(doc(db, 'timetable_settings', 'main'), newTimetableSettings).then(() => newTimetableSettings);
}

export const resetData = (): Promise<{ success: boolean }> => {
    return apiFetch('/api/reset-db', {
        method: 'POST',
    });
};

// --- DATA PORTABILITY ---
export const importDataManagementData = (data: any): Promise<{ success: boolean; message: string }> => {
    return apiFetch('/api/data/import', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};
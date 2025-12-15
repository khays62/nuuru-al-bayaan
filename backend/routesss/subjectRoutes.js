import express from 'express';
import { getSubjects, addSubject, updateSubject, deleteSubject } from '../controllersss/subjectController.js';

const router = express.Router();

// Setup the routes for getting all subjects and adding a new one
router.route('/')
    .get(getSubjects)
    .post(addSubject);

router.route('/:id')
    .put(updateSubject)
    .delete(deleteSubject);

export default router;

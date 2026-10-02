'use client';

import React from 'react';
import { LessonModal } from './LessonModal';
import { FullLessonData } from '@/lib/data/mockData';

export interface EditLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: FullLessonData;
  onSaved?: (updatedLesson: FullLessonData) => void;
}

export function EditLessonModal({ isOpen, onClose, lesson, onSaved }: EditLessonModalProps) {
  return (
    <LessonModal
      isOpen={isOpen}
      lesson={lesson}
      initialTab="main"
      onClose={onClose}
      onSave={(updated) => {
        if (onSaved) onSaved(updated);
      }}
    />
  );
}

export default EditLessonModal;

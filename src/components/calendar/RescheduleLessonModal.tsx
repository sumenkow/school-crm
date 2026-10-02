'use client';

import React from 'react';
import { LessonModal } from './LessonModal';
import { FullLessonData } from '@/lib/data/mockData';

export interface RescheduleLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: FullLessonData | null;
  onReschedule?: (updatedLesson: FullLessonData) => void;
}

export function RescheduleLessonModal({
  isOpen,
  onClose,
  lesson,
  onReschedule,
}: RescheduleLessonModalProps) {
  return (
    <LessonModal
      isOpen={isOpen}
      lesson={lesson}
      initialTab="main"
      highlightReschedule={true}
      onClose={onClose}
      onSave={(updated) => {
        if (onReschedule) onReschedule(updated);
      }}
    />
  );
}

export default RescheduleLessonModal;

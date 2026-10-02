'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DashboardStateReturn } from '../hooks/useDashboardState';
import { HeaderGreeting } from './HeaderGreeting';
import { KpiGrid } from './KpiGrid';
import { AnalyticsSection } from './AnalyticsSection';
import { AttentionFeed } from './AttentionFeed';
import { TodayScheduleWidget } from './TodayScheduleWidget';
import { FunnelWidget } from './FunnelWidget';
import { TeachersListWidget } from './TeachersListWidget';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import { TaskModal } from '@/components/dashboard/TaskModal';
import { TeacherModal } from '@/components/dashboard/TeacherModal';
import { QuickActionDrawer } from '@/components/dashboard/QuickActionDrawer';
import { CreateLeadModal } from '@/components/crm/CreateLeadModal';
import { LeadDetailsModal } from '@/components/crm/LeadDetailsModal';

interface DashboardDesktopProps extends DashboardStateReturn {
  onOpenReport: () => void;
  onOpenExecutiveReport?: () => void;
}

export function DashboardDesktop({
  data,
  actions,
  onOpenReport,
  onOpenExecutiveReport,
}: DashboardDesktopProps) {
  const router = useRouter();

  return (
    <div className="hidden md:block space-y-6 w-full p-6 max-w-[1600px] mx-auto">
      {/* 1. Header Greeting & Top Actions */}
      <HeaderGreeting
        onOpenReport={onOpenReport}
        onOpenExecutiveReport={onOpenExecutiveReport}
        onOpenCreateLead={actions.openCreateLead}
      />

      {/* 2. Real Data-Backed KPI Metrics (5 Cards) */}
      <WidgetErrorBoundary widgetName="Метрики KPI" onRetry={actions.refreshAll}>
        <KpiGrid
          payments={data.payments}
          students={data.students}
          leads={data.leads}
          groups={data.groups}
          tasks={data.tasks}
          isLoading={data.isLoading}
        />
      </WidgetErrorBoundary>

      {/* 3. Analytics Layer (Revenue Chart, Leads Chart, Group Occupancy with Shared Period Controller) */}
      <AnalyticsSection
        payments={data.payments}
        leads={data.leads}
        groups={data.groups}
        isLoading={data.isLoading}
        onRetry={actions.refreshAll}
      />

      {/* 4. Operational Dashboard Grid (2 Columns: 7/12 Focus & Schedule vs 5/12 Funnel & Teachers) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (7 cols): Attention Focus & Today's Schedule */}
        <div className="lg:col-span-7 space-y-6">
          <WidgetErrorBoundary widgetName="Фокус внимания" onRetry={actions.refreshAll}>
            <AttentionFeed
              payments={data.payments}
              leads={data.leads}
              groups={data.groups}
              tasks={data.tasks}
              students={data.students}
              onOpenLead={actions.openLead}
              onOpenTask={actions.openTask}
              isLoading={data.isLoading}
            />
          </WidgetErrorBoundary>

          <WidgetErrorBoundary widgetName="Расписание на сегодня" onRetry={actions.refreshAll}>
            <TodayScheduleWidget
              lessons={data.lessons}
              isLoading={data.isLoading}
            />
          </WidgetErrorBoundary>
        </div>

        {/* Right Column (5 cols): Lead Conversion Funnel & Teachers Team */}
        <div className="lg:col-span-5 space-y-6">
          <WidgetErrorBoundary widgetName="Воронка продаж" onRetry={actions.refreshAll}>
            <FunnelWidget
              leads={data.leads}
              isLoading={data.isLoading}
            />
          </WidgetErrorBoundary>

          <WidgetErrorBoundary widgetName="Команда преподавателей" onRetry={actions.refreshAll}>
            <TeachersListWidget
              teachers={data.teachers}
              groups={data.groups}
              onSelectTeacher={(t) => actions.openTeacher(t)}
              isLoading={data.isLoading}
            />
          </WidgetErrorBoundary>
        </div>
      </div>

      {/* Modals & Drawers */}
      <TaskModal
        isOpen={!!data.selectedTask}
        taskData={data.selectedTask}
        onClose={actions.closeTask}
        onComplete={actions.completeTask}
      />

      <TeacherModal
        isOpen={!!data.selectedTeacher}
        teacherData={data.selectedTeacher}
        onClose={actions.closeTeacher}
      />

      <CreateLeadModal
        isOpen={data.isCreateLeadOpen}
        onClose={actions.closeCreateLead}
        onCreated={() => {
          actions.refreshAll();
          actions.closeCreateLead();
        }}
      />

      <LeadDetailsModal
        isOpen={data.isLeadDrawerOpen && !!data.selectedLead}
        lead={data.selectedLead}
        onClose={actions.closeLead}
        onUpdateLead={() => actions.refreshAll()}
      />

      <QuickActionDrawer
        state={data.drawerState}
        onClose={actions.closeDrawer}
        onSuccess={() => actions.refreshAll()}
      />
    </div>
  );
}

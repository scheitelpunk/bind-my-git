# Localization Implementation Guide

## Overview
This document provides guidance on implementing i18n translations for the remaining pages in the Project Management System.

## Setup Complete ✓
- i18next, react-i18next, and i18next-browser-languagedetector installed
- Configuration file created: `src/i18n/config.ts`
- Translation files created for English and German: `src/i18n/locales/{en,de}.json`
- Language switcher component added to Header
- Main pages translated: Dashboard, Sidebar, Header, Projects

## Translation Keys Structure

### Common Keys
```typescript
t('common.save')          // Save / Speichern
t('common.cancel')        // Cancel / Abbrechen
t('common.delete')        // Delete / Löschen
t('common.edit')          // Edit / Bearbeiten
t('common.create')        // Create / Erstellen
t('common.update')        // Update / Aktualisieren
t('common.filter')        // Filter / Filtern
t('common.search')        // Search / Suchen
t('common.loading')       // Loading... / Laden...
t('common.previous')      // Previous / Zurück
t('common.next')          // Next / Weiter
```

### Project-Specific Keys
```typescript
t('projects.title')               // Projects / Projekte
t('projects.createProject')       // Create Project / Projekt erstellen
t('projects.projectName')         // Project Name / Projektname
t('projects.description')         // Description / Beschreibung
t('projects.startDate')           // Start Date / Startdatum
t('projects.endDate')             // End Date / Enddatum
t('projects.owner')               // Owner / Eigentümer
t('projects.teamMembers')         // Team Members / Teammitglieder
t('projects.addMember')           // Add Member / Mitglied hinzufügen
t('projects.remove')              // Remove / Entfernen
t('projects.tasksOverview')       // Tasks Overview / Aufgabenübersicht
```

### Task-Specific Keys
```typescript
t('tasks.title')                  // Tasks / Aufgaben
t('tasks.createTask')             // Create Task / Aufgabe erstellen
t('tasks.taskTitle')              // Task Title / Aufgabentitel
t('tasks.priority')               // Priority / Priorität
t('tasks.assignee')               // Assignee / Zugewiesener
t('tasks.estimatedHours')         // Estimated Hours / Geschätzte Stunden
t('tasks.dueDate')                // Due Date / Fälligkeitsdatum
t('tasks.comments')               // Comments / Kommentare
t('tasks.addComment')             // Add Comment / Kommentar hinzufügen
```

### Status Keys
```typescript
t('projectStatus.planning')       // Planning / Planung
t('projectStatus.active')         // Active / Aktiv
t('projectStatus.onHold')         // On Hold / Pausiert
t('projectStatus.completed')      // Completed / Abgeschlossen
t('projectStatus.cancelled')      // Cancelled / Abgebrochen

t('taskStatus.backlog')           // Backlog / Rückstand
t('taskStatus.todo')              // To Do / Zu erledigen
t('taskStatus.inProgress')        // In Progress / In Bearbeitung
t('taskStatus.inReview')          // In Review / In Überprüfung
t('taskStatus.done')              // Done / Erledigt

t('priority.low')                 // Low / Niedrig
t('priority.medium')              // Medium / Mittel
t('priority.high')                // High / Hoch
t('priority.urgent')              // Urgent / Dringend
```

## Implementation Pattern

### Step 1: Import useTranslation
```typescript
import { useTranslation } from 'react-i18next';
```

### Step 2: Initialize translation function
```typescript
const MyComponent: React.FC = () => {
  const { t } = useTranslation();
  // ... rest of component
};
```

### Step 3: Replace hardcoded strings
```typescript
// Before
<h1>Projects</h1>
<Button>Create Project</Button>

// After
<h1>{t('projects.title')}</h1>
<Button>{t('projects.createProject')}</Button>
```

### Step 4: Handle dynamic content
```typescript
// With interpolation
<p>{t('dashboard.welcome', { name: user.first_name })}</p>

// With counts
<p>{t('projects.viewAll', { count: tasks.length })}</p>

// With formatting
<p>{t('common.showing', { from: 1, to: 10, total: 100 })}</p>
```

### Step 5: Translate status enums
```typescript
// Status badges - use dynamic keys
<Badge>{t(`projectStatus.${project.status.toLowerCase()}`)}</Badge>
<Badge>{t(`taskStatus.${task.status.toLowerCase()}`)}</Badge>
<Badge>{t(`priority.${task.priority.toLowerCase()}`)}</Badge>
```

## Pages Requiring Translation

### 1. Tasks.tsx
**Key areas:**
- Page title and subtitle
- Filter placeholders (search, status, priority, project)
- Button labels (Create Task, Filter)
- Status options in dropdowns
- Priority options
- Modal titles (Create New Task, Task Details)
- Form labels (Task Title, Description, Project, etc.)
- Empty states
- Pagination controls

**Implementation notes:**
- Status dropdown options should use `taskStatus.*` keys
- Priority dropdown should use `priority.*` keys
- Replace all static strings with `t()` calls

### 2. ProjectDetail.tsx
**Key areas:**
- "Back to Projects" link
- Button labels (Edit Project, Delete Project, Add Member, Remove)
- Section headings (Team Members, Tasks Overview)
- Form labels in modals
- Confirmation dialogs
- Status badges
- Member roles
- Task counters (To Do, In Progress, In Review, Done)

**Implementation notes:**
- Use `projects.backToProjects`, `projects.editProject`, etc.
- Team member section: `projects.teamMembers`, `projects.addMember`
- Delete confirmation: `projects.deleteConfirm`, `projects.deleteWarning`

### 3. TaskDetail.tsx
**Key areas:**
- Task title and metadata
- Form fields for editing
- Comments section
- Time tracking integration
- Status and priority badges
- Button labels

**Implementation notes:**
- Follow same pattern as ProjectDetail
- Use `tasks.*` namespace for all strings
- Translate validation messages

### 4. TimeTracking.tsx
**Key areas:**
- Page title
- Timer controls
- Time entry list
- Project/task selection
- Date/time formatters

**Implementation notes:**
- Add new `timeTracking.*` namespace to translation files
- Include keys for: `start`, `stop`, `pause`, `resume`, `currentSession`, `totalToday`

### 5. Admin.tsx
**Key areas:**
- User management section
- Role assignment
- System settings
- Permissions

**Implementation notes:**
- Add `admin.*` namespace
- Include permission-related translations

## Modal Components

All modals should translate:
1. Title prop
2. Button labels (Save, Cancel, Confirm, Delete)
3. Form field labels
4. Validation error messages
5. Confirmation messages

Example:
```typescript
<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title={t('projects.editProject')}
>
  <form onSubmit={handleSubmit}>
    <Input label={t('projects.projectName')} />
    <Button type="submit">{t('common.update')}</Button>
    <Button variant="secondary">{t('common.cancel')}</Button>
  </form>
</Modal>
```

## Best Practices

1. **Namespace Organization**: Group related translations
   - `nav.*` - Navigation items
   - `projects.*` - Project-related strings
   - `tasks.*` - Task-related strings
   - `common.*` - Shared/reusable strings
   - `priority.*`, `projectStatus.*`, `taskStatus.*` - Enum values

2. **Key Naming**: Use camelCase for keys
   - `createProject` not `create_project` or `create-project`

3. **Avoid Duplication**: Use `common.*` for frequently used strings

4. **Context**: Include context in longer keys
   - `projects.deleteConfirm` instead of just `deleteConfirm`

5. **Pluralization**: Use i18next pluralization features when needed
   ```typescript
   t('items', { count: 5 })  // "5 items" / "5 Elemente"
   ```

6. **HTML in Translations**: Avoid when possible, use interpolation instead

7. **Testing**: Test both languages to ensure:
   - All strings are translated
   - Layout doesn't break with longer German strings
   - Special characters display correctly

## File Structure
```
frontend/src/
├── i18n/
│   ├── config.ts           # i18next configuration
│   └── locales/
│       ├── en.json         # English translations
│       └── de.json         # German translations
└── components/
    └── ui/
        └── LanguageSwitcher.tsx  # Language toggle component
```

## Adding New Languages

To add a new language (e.g., French):

1. Create `frontend/src/i18n/locales/fr.json`
2. Copy structure from `en.json`
3. Translate all values
4. Update `config.ts`:
```typescript
import fr from './locales/fr.json';

i18n.init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    fr: { translation: fr },  // Add new language
  },
  // ...
});
```

5. Update LanguageSwitcher component to include French option

## Common Issues & Solutions

### Issue: Translation missing
**Solution**: Check console for missing key warnings, add to JSON files

### Issue: Layout breaks with German text
**Solution**: Use CSS truncation or flexible layouts
```css
.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### Issue: Interpolation not working
**Solution**: Ensure proper syntax with double curly braces in JSON:
```json
{
  "welcome": "Welcome, {{name}}!"
}
```

### Issue: Status/enum translations not showing
**Solution**: Convert enum to lowercase and use template string:
```typescript
t(`projectStatus.${status.toLowerCase()}`)
```

## Next Steps

To complete the localization:

1. Apply the translation pattern to Tasks.tsx
2. Translate ProjectDetail.tsx (add translations for team members, delete modal)
3. Translate TaskDetail.tsx
4. Add timeTracking namespace and translate TimeTracking.tsx
5. Add admin namespace and translate Admin.tsx
6. Test all pages in both languages
7. Fix any layout issues caused by longer German strings
8. Add language persistence (already configured via localStorage)

## References

- i18next Documentation: https://www.i18next.com/
- react-i18next Documentation: https://react.i18next.com/
- Translation keys: See `frontend/src/i18n/locales/*.json`

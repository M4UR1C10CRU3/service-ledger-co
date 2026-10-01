import { CalendarDays } from 'lucide-react';
import { AgendaSchool } from '@/components/school/AgendaSchool';

/**
 * Calendarização da escola, para a equipa que a gere.
 *
 * O instrutor tem a sua no portal e só vê os próprios compromissos — a
 * separação é feita na função school_agenda, não neste ecrã.
 */
export default function SchoolCalendario() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />Calendarização
        </h1>
        <p className="text-sm text-muted-foreground">
          Turmas, cursos e formações corporativas
        </p>
      </div>

      <AgendaSchool />
    </div>
  );
}

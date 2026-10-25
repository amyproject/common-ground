import { practices } from '../data/practices.ts'
import type { PracticeId, Resource, ResourceCategory, Suggestion } from '../types.ts'

export function safePublicUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && Boolean(url.hostname)
  } catch {
    return false
  }
}

export function filterResources(
  resources: Resource[],
  filters: { search?: string; city?: string; category?: ResourceCategory | 'All'; practices?: PracticeId[] },
): Resource[] {
  const search = (filters.search ?? '').trim().toLocaleLowerCase()
  return resources.filter((resource) => {
    if (resource.status === 'inactive') return false
    if (filters.city && filters.city !== 'All' && resource.city !== filters.city && resource.county !== filters.city) return false
    if (filters.category && filters.category !== 'All' && resource.category !== filters.category) return false
    if (filters.practices?.length && !resource.practices.some((id) => filters.practices!.includes(id))) return false
    const searchable = [
      resource.name,
      resource.city,
      resource.neighborhood,
      resource.description,
      resource.category,
      ...resource.practices.map((id) => practices.find((practice) => practice.id === id)!.name),
    ].join(' ').toLocaleLowerCase()
    return !search || searchable.includes(search)
  })
}

export function makeSuggestion(
  resource: Resource,
  input: { field: 'access' | 'status'; after: string; sourceUrl: string; note: string },
  now = new Date().toISOString(),
): { suggestion?: Suggestion; error?: string } {
  const after = input.after.trim()
  if (!['access', 'status'].includes(input.field)) return { error: 'Choose an editable field.' }
  if (!safePublicUrl(input.sourceUrl.trim())) return { error: 'Add a public http or https source link.' }
  if (input.field === 'access' && (after.length < 10 || after.length > 600)) {
    return { error: 'Write access information between 10 and 600 characters.' }
  }
  if (input.field === 'status' && !['source-checked', 'inactive'].includes(after)) {
    return { error: 'Choose an active or inactive status.' }
  }
  if (after === resource[input.field]) return { error: 'The suggested value is the same as the current listing.' }
  if (input.note.length > 600) return { error: 'Keep your explanation under 600 characters.' }
  return {
    suggestion: {
      id: `suggestion-${crypto.randomUUID()}`,
      resourceId: resource.id,
      resourceName: resource.name,
      field: input.field,
      before: resource[input.field],
      after,
      sourceUrl: input.sourceUrl.trim(),
      note: input.note.trim(),
      status: 'pending',
      submittedAt: now,
    },
  }
}

export function reviewSuggestion(
  resources: Resource[],
  suggestions: Suggestion[],
  id: string,
  decision: 'approved' | 'declined',
  now = new Date().toISOString(),
): { resources: Resource[]; suggestions: Suggestion[]; error?: string } {
  const suggestion = suggestions.find((item) => item.id === id)
  const resource = resources.find((item) => item.id === suggestion?.resourceId)
  if (!suggestion || !resource || suggestion.status !== 'pending') {
    return { resources, suggestions, error: 'This correction is no longer pending.' }
  }
  if (decision === 'approved') {
    if (resource[suggestion.field] !== suggestion.before) {
      return { resources, suggestions, error: 'The listing changed after this suggestion. Decline it and review a fresh correction.' }
    }
    if (!safePublicUrl(suggestion.sourceUrl)) return { resources, suggestions, error: 'The source link is invalid.' }
    if (
      (suggestion.field === 'status' && !['source-checked', 'inactive'].includes(suggestion.after)) ||
      (suggestion.field === 'access' && (suggestion.after.length < 10 || suggestion.after.length > 600))
    ) {
      return { resources, suggestions, error: 'The proposed value is invalid.' }
    }
  }
  const nextResources = decision === 'approved'
    ? resources.map((item): Resource => {
      if (item.id !== resource.id) return item
      const status = suggestion.field === 'status'
        ? suggestion.after === 'inactive' ? 'inactive' : 'demo-reviewed'
        : item.status === 'inactive' ? 'inactive' : 'demo-reviewed'
      return {
        ...item,
        access: suggestion.field === 'access' ? suggestion.after : item.access,
        status,
        reviewedAt: now,
        reviewSourceUrl: suggestion.sourceUrl,
        reviewer: 'Local demo reviewer',
      }
    })
    : resources
  return {
    resources: nextResources,
    suggestions: suggestions.map((item) => item.id === id ? { ...item, status: decision, reviewedAt: now } : item),
  }
}

export function exampleSuggestion(resource: Resource): Suggestion {
  return {
    id: 'demo-anv-correction',
    resourceId: resource.id,
    resourceName: resource.name,
    field: 'access',
    before: resource.access,
    after: 'Apply through ANV’s volunteer form, then confirm the current schedule and age requirements directly with the team.',
    sourceUrl: resource.sourceUrl,
    note: 'Demo correction: make the application-first step easier to understand. This is a local review exercise.',
    status: 'pending',
    submittedAt: '2026-10-24T16:00:00.000Z',
    demo: true,
  }
}

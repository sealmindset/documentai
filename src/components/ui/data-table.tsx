'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  ListFilter,
  X,
  Search,
} from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  filterable?: boolean
  /**
   * Extract the filterable/searchable display value from a row.
   * Defaults to getNestedValue(row, key) stringified.
   */
  filterValue?: (row: T) => string
  /** Include this column in text search. Defaults to true for string columns. */
  searchable?: boolean
  className?: string
  render?: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  pageSize?: number
  loading?: boolean
  /** Show a built-in search bar. Pass placeholder text to enable. */
  searchPlaceholder?: string
  /** Extra content rendered to the right of the search bar (e.g. buttons). */
  toolbar?: React.ReactNode
  emptyIcon?: React.ReactNode
  emptyTitle?: string
  emptyDescription?: string
  onRowClick?: (row: T) => void
}

type SortDir = 'asc' | 'desc' | null

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}

function resolveFilterValue<T>(row: T, col: Column<T>): string {
  if (col.filterValue) return col.filterValue(row as T)
  const val = getNestedValue(row, col.key)
  if (val == null) return ''
  return String(val)
}

// ── Column Filter Popover ────────────────────────────────────────────────────

interface ColumnFilterProps<T> {
  column: Column<T>
  data: T[]
  activeValues: Set<string> | null
  onFilterChange: (key: string, values: Set<string> | null) => void
}

function ColumnFilter<T extends Record<string, any>>({
  column,
  data,
  activeValues,
  onFilterChange,
}: ColumnFilterProps<T>) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const distinctValues = useMemo(() => {
    const vals = new Map<string, number>()
    for (const row of data) {
      const v = resolveFilterValue(row, column)
      if (v !== '') vals.set(v, (vals.get(v) || 0) + 1)
    }
    return Array.from(vals.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [data, column])

  const filtered = search
    ? distinctValues.filter(([v]) => v.toLowerCase().includes(search.toLowerCase()))
    : distinctValues

  const isFiltered = activeValues !== null

  const toggle = (value: string) => {
    let next: Set<string>
    if (activeValues === null) {
      next = new Set(distinctValues.map(([v]) => v))
      next.delete(value)
    } else {
      next = new Set(activeValues)
      if (next.has(value)) next.delete(value)
      else next.add(value)
    }
    if (next.size === distinctValues.length) {
      onFilterChange(column.key, null)
    } else {
      onFilterChange(column.key, next)
    }
  }

  const selectAll = () => onFilterChange(column.key, null)
  const clearAll = () => onFilterChange(column.key, new Set())

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch('') }}>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center justify-center rounded p-0.5 hover:bg-accent transition-colors ${
            isFiltered ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
          }`}
          title={`Filter ${column.header}`}
          onClick={(e) => e.stopPropagation()}
        >
          <ListFilter className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-60 p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 pl-7 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-3 py-1.5 border-b bg-gray-50">
          <button className="text-xs text-blue-600 hover:underline" onClick={selectAll}>
            Select All
          </button>
          <button className="text-xs text-blue-600 hover:underline" onClick={clearAll}>
            Clear All
          </button>
        </div>

        <div className="max-h-52 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-500">No matches</div>
          )}
          {filtered.map(([value, count]) => {
            const checked = activeValues === null || activeValues.has(value)
            return (
              <label
                key={value}
                className="flex items-center gap-2 px-3 py-1 hover:bg-accent cursor-pointer text-sm"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(value)}
                  className="h-3.5 w-3.5"
                />
                <span className="truncate flex-1">{value}</span>
                <span className="text-xs text-muted-foreground shrink-0">{count}</span>
              </label>
            )
          })}
        </div>

        {isFiltered && (
          <div className="flex items-center justify-between px-3 py-1.5 border-t bg-blue-50">
            <span className="text-xs text-blue-700">
              {activeValues!.size} of {distinctValues.length} selected
            </span>
            <button
              className="text-xs text-blue-700 hover:underline flex items-center gap-0.5"
              onClick={selectAll}
            >
              <X className="h-3 w-3" /> Clear
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ── Active Filters Bar ───────────────────────────────────────────────────────

function ActiveFiltersBar<T>({
  columns,
  filters,
  searchTerm,
  onFilterChange,
  onClearAll,
}: {
  columns: Column<T>[]
  filters: Record<string, Set<string>>
  searchTerm: string
  onFilterChange: (key: string, values: Set<string> | null) => void
  onClearAll: () => void
}) {
  const filterEntries = Object.entries(filters)
  if (filterEntries.length === 0 && !searchTerm) return null

  return (
    <div className="flex items-center gap-2 px-2 py-2 bg-blue-50 border border-blue-200 rounded-md mb-3 flex-wrap">
      <ListFilter className="h-3.5 w-3.5 text-blue-600 shrink-0" />
      <span className="text-xs text-blue-700 font-medium shrink-0">Active filters:</span>
      {searchTerm && (
        <span className="inline-flex items-center gap-1 bg-white border border-blue-200 rounded px-2 py-0.5 text-xs text-blue-800">
          <span className="font-medium">Search:</span> &ldquo;{searchTerm}&rdquo;
        </span>
      )}
      {filterEntries.map(([key, values]) => {
        const col = columns.find((c) => c.key === key)
        const label = col?.header || key
        const display = values.size <= 2
          ? Array.from(values).join(', ')
          : `${values.size} selected`
        return (
          <span
            key={key}
            className="inline-flex items-center gap-1 bg-white border border-blue-200 rounded px-2 py-0.5 text-xs text-blue-800"
          >
            <span className="font-medium">{label}:</span> {display}
            <button onClick={() => onFilterChange(key, null)} className="hover:text-red-600 ml-0.5">
              <X className="h-3 w-3" />
            </button>
          </span>
        )
      })}
      {(filterEntries.length > 0 || searchTerm) && (
        <button onClick={onClearAll} className="text-xs text-blue-700 hover:underline ml-auto">
          Clear all
        </button>
      )}
    </div>
  )
}

// ── DataTable ────────────────────────────────────────────────────────────────

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  pageSize = 20,
  loading = false,
  searchPlaceholder,
  toolbar,
  emptyIcon,
  emptyTitle = 'No data',
  emptyDescription,
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<Record<string, Set<string>>>({})
  const [searchTerm, setSearchTerm] = useState('')

  const handleFilterChange = useCallback((key: string, values: Set<string> | null) => {
    setFilters((prev) => {
      const next = { ...prev }
      if (values === null) {
        delete next[key]
      } else {
        next[key] = values
      }
      return next
    })
    setPage(0)
  }, [])

  const clearAllFilters = useCallback(() => {
    setFilters({})
    setSearchTerm('')
    setPage(0)
  }, [])

  // Searchable columns: those with searchable !== false and have filterValue or string key
  const searchableColumns = useMemo(
    () => columns.filter((c) => c.searchable !== false && c.key !== 'actions'),
    [columns]
  )

  // Text search
  const searched = useMemo(() => {
    if (!searchTerm) return data
    const q = searchTerm.toLowerCase()
    return data.filter((row) =>
      searchableColumns.some((col) => {
        const val = resolveFilterValue(row, col)
        return val.toLowerCase().includes(q)
      })
    )
  }, [data, searchTerm, searchableColumns])

  // Column filters
  const filtered = useMemo(() => {
    const filterEntries = Object.entries(filters)
    if (filterEntries.length === 0) return searched
    return searched.filter((row) =>
      filterEntries.every(([key, allowed]) => {
        const col = columns.find((c) => c.key === key)
        if (!col) return true
        const val = resolveFilterValue(row, col)
        return allowed.has(val)
      })
    )
  }, [searched, filters, columns])

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered
    return [...filtered].sort((a, b) => {
      const aVal = getNestedValue(a, sortKey)
      const bVal = getNestedValue(b, sortKey)
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      const cmp = String(aVal).localeCompare(String(bVal))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc')
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null) }
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  const hasActiveFilters = Object.keys(filters).length > 0 || !!searchTerm
  const showSearchBar = !!searchPlaceholder

  return (
    <div>
      {/* Search bar + toolbar */}
      {(showSearchBar || toolbar) && (
        <div className="flex items-center gap-3 mb-4">
          {showSearchBar && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0) }}
                className="pl-9"
              />
              {searchTerm && (
                <button
                  onClick={() => { setSearchTerm(''); setPage(0) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {/* Active filters bar */}
      <ActiveFiltersBar
        columns={columns}
        filters={filters}
        searchTerm={searchTerm}
        onFilterChange={handleFilterChange}
        onClearAll={clearAllFilters}
      />

      {/* Empty state (no data at all) */}
      {data.length === 0 && !hasActiveFilters ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          {emptyIcon || <Inbox className="h-12 w-12 text-gray-300 mb-3" />}
          <h3 className="text-lg font-medium text-gray-900">{emptyTitle}</h3>
          {emptyDescription && <p className="text-sm text-gray-500 mt-1">{emptyDescription}</p>}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={col.className}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    style={col.sortable ? { cursor: 'pointer', userSelect: 'none' } : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.sortable && (
                        sortKey === col.key
                          ? sortDir === 'asc'
                            ? <ChevronUp className="h-3.5 w-3.5" />
                            : <ChevronDown className="h-3.5 w-3.5" />
                          : <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400" />
                      )}
                      {col.filterable && (
                        <ColumnFilter
                          column={col}
                          data={data}
                          activeValues={filters[col.key] ?? null}
                          onFilterChange={handleFilterChange}
                        />
                      )}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-8">
                    <div className="text-gray-500">
                      <ListFilter className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm font-medium">No rows match the current filters</p>
                      <button
                        onClick={clearAllFilters}
                        className="text-xs text-blue-600 hover:underline mt-1"
                      >
                        Clear all filters
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((row, i) => (
                  <TableRow
                    key={(row as any).id || i}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={onRowClick ? 'cursor-pointer' : undefined}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.render ? col.render(row) : getNestedValue(row, col.key)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Footer: row count + pagination */}
          <div className="flex items-center justify-between px-2 py-3 border-t">
            <p className="text-sm text-gray-500">
              {hasActiveFilters && sorted.length !== data.length && (
                <span className="text-blue-600 font-medium">{sorted.length} of {data.length} rows · </span>
              )}
              {totalPages > 1
                ? `Showing ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, sorted.length)} of ${sorted.length}`
                : `${sorted.length} row${sorted.length !== 1 ? 's' : ''}`
              }
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

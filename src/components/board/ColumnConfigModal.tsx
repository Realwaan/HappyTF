'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles, 
  DollarSign, 
  Star, 
  CheckSquare, 
  ListFilter, 
  Binary, 
  Type, 
  Calculator, 
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { BoardColumn, ColumnType, ColumnOption } from '../../lib/mondaydb/types';
import { validateFormulaSyntax } from '../../lib/customFields/customFieldEngine';
import { playClickSound, playCompleteSound } from '../../lib/soundFx';

interface ColumnConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveColumn: (column: BoardColumn) => void;
  onDeleteColumn?: (columnId: string) => void;
  initialColumn?: BoardColumn | null;
  existingColumns: BoardColumn[];
}

const FIELD_PRESETS: {
  type: ColumnType;
  title: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}[] = [
  {
    type: 'currency',
    title: 'Currency',
    icon: <DollarSign size={18} />,
    description: 'Financial amounts, budgets, and cost tracking with symbols',
    color: '#10b981'
  },
  {
    type: 'rating',
    title: 'Rating',
    icon: <Star size={18} />,
    description: '1 to 5 star scores for priority, quality, or risk evaluation',
    color: '#f59e0b'
  },
  {
    type: 'checkbox',
    title: 'Checkbox',
    icon: <CheckSquare size={18} />,
    description: 'Boolean approvals, sign-offs, and verification flags',
    color: '#6366f1'
  },
  {
    type: 'dropdown',
    title: 'Dropdown',
    icon: <ListFilter size={18} />,
    description: 'Single-select category tags with customizable color badges',
    color: '#ec4899'
  },
  {
    type: 'formula',
    title: 'Formula',
    icon: <Calculator size={18} />,
    description: 'Dynamic calculations evaluated automatically across item values',
    color: '#8b5cf6'
  },
  {
    type: 'number',
    title: 'Number',
    icon: <Binary size={18} />,
    description: 'Numeric metrics, counts, hours, or capacity points',
    color: '#06b6d4'
  },
  {
    type: 'text',
    title: 'Text',
    icon: <Type size={18} />,
    description: 'Short textual notes, reference codes, or external URLs',
    color: '#94a3b8'
  }
];

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'
];

export const ColumnConfigModal: React.FC<ColumnConfigModalProps> = ({
  isOpen,
  onClose,
  onSaveColumn,
  onDeleteColumn,
  initialColumn,
  existingColumns,
}) => {
  const isEditing = Boolean(initialColumn);

  const [title, setTitle] = useState('');
  const [selectedType, setSelectedType] = useState<ColumnType>('currency');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('$');
  const [precision, setPrecision] = useState(0);
  const [rollup, setRollup] = useState<'sum' | 'avg' | 'min' | 'max' | 'count_checked' | 'none'>('sum');
  const [maxRating, setMaxRating] = useState(5);
  const [formula, setFormula] = useState('');
  const [options, setOptions] = useState<ColumnOption[]>([]);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionColor, setNewOptionColor] = useState('#3b82f6');

  // Initialize form state when opening or switching column
  useEffect(() => {
    if (initialColumn) {
      setTitle(initialColumn.title);
      setSelectedType(initialColumn.type);
      setDescription(initialColumn.description || '');
      setUnit(initialColumn.settings?.unit || (initialColumn.type === 'currency' ? '$' : ''));
      setPrecision(initialColumn.settings?.precision ?? (initialColumn.type === 'currency' ? 0 : 2));
      setRollup(initialColumn.settings?.rollup || 'none');
      setMaxRating(initialColumn.settings?.maxRating || 5);
      setFormula(initialColumn.settings?.formula || '');
      setOptions(initialColumn.settings?.options || []);
    } else {
      setTitle('');
      setSelectedType('currency');
      setDescription('');
      setUnit('$');
      setPrecision(0);
      setRollup('sum');
      setMaxRating(5);
      setFormula('{Budget} / ({Story Pts} * 100)');
      setOptions([
        { id: `opt-1`, label: 'Design', color: '#ec4899' },
        { id: `opt-2`, label: 'Engineering', color: '#3b82f6' },
        { id: `opt-3`, label: 'QA', color: '#10b981' }
      ]);
    }
    setNewOptionLabel('');
  }, [initialColumn, isOpen]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Real-time formula validation
  const formulaValidation = useMemo(() => {
    if (selectedType !== 'formula') return null;
    return validateFormulaSyntax(formula, existingColumns);
  }, [formula, selectedType, existingColumns]);

  if (!isOpen) return null;

  const handleSelectType = (type: ColumnType) => {
    setSelectedType(type);
    playClickSound();

    // Contextual defaults for chosen type
    if (type === 'currency') {
      if (!unit || unit === 'pts' || unit === 'x') setUnit('$');
      setPrecision(0);
      setRollup('sum');
    } else if (type === 'rating') {
      setMaxRating(5);
      setRollup('avg');
    } else if (type === 'checkbox') {
      setRollup('count_checked');
    } else if (type === 'formula') {
      if (!formula) setFormula('{Budget} / ({Story Pts} * 100)');
      setUnit('x');
      setPrecision(2);
      setRollup('avg');
    } else if (type === 'number') {
      setUnit('pts');
      setPrecision(0);
      setRollup('sum');
    } else {
      setRollup('none');
    }
  };

  const handleAddOption = () => {
    const trimmed = newOptionLabel.trim();
    if (!trimmed) return;
    const newOpt: ColumnOption = {
      id: `opt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      label: trimmed,
      color: newOptionColor,
    };
    setOptions((prev) => [...prev, newOpt]);
    setNewOptionLabel('');
    playClickSound();
  };

  const handleRemoveOption = (id: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const handleInsertFormulaToken = (token: string) => {
    setFormula((prev) => `${prev} ${token}`.trim());
    playClickSound();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || `New ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`;
    const columnId = initialColumn?.id || `col-custom-${Date.now()}`;

    const newColumn: BoardColumn = {
      id: columnId,
      title: finalTitle,
      type: selectedType,
      description: description.trim() || undefined,
      width: initialColumn?.width || 120,
      settings: {
        unit: unit.trim() || undefined,
        precision,
        rollup,
        maxRating: selectedType === 'rating' ? maxRating : undefined,
        formula: selectedType === 'formula' ? formula.trim() : undefined,
        options: selectedType === 'dropdown' ? options : undefined,
      }
    };

    playCompleteSound();
    onSaveColumn(newColumn);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-700/80 bg-slate-900/95 shadow-2xl text-slate-100 overflow-hidden"
        id="column-config-modal"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">
                {isEditing ? `Edit Column: ${initialColumn?.title}` : 'Add Custom Column'}
              </h2>
              <p className="text-xs text-slate-400">
                Configure field types, formula expressions, and columnar summary rollups
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            id="close-column-modal-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Column Title & Description */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Column Name <span className="text-rose-400">*</span>
              </label>
              <input
                id="column-title-input"
                type="text"
                required
                placeholder="e.g. Budget ($), Client Sign-off, Effort ROI, Rating"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/70 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Description (Optional)
              </label>
              <input
                id="column-desc-input"
                type="text"
                placeholder="Brief helper hint for teammates"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950/60 border border-slate-700/70 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Type Preset Selector Grid */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Select Column Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {FIELD_PRESETS.map((preset) => {
                const isSelected = selectedType === preset.type;
                return (
                  <button
                    key={preset.type}
                    type="button"
                    onClick={() => handleSelectType(preset.type)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/40 shadow-lg shadow-indigo-950/50'
                        : 'border-slate-800 bg-slate-950/30 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div 
                      className="p-2 rounded-lg mb-2"
                      style={{ 
                        backgroundColor: `${preset.color}20`, 
                        color: preset.color,
                        border: `1px solid ${preset.color}40`
                      }}
                    >
                      {preset.icon}
                    </div>
                    <span className="text-xs font-semibold text-white">{preset.title}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-tight">
                      {preset.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contextual Settings for Selected Type */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} /> Type Settings: {selectedType.toUpperCase()}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                id: {initialColumn?.id || 'new'}
              </span>
            </div>

            {/* CURRENCY & NUMBER SETTINGS */}
            {(selectedType === 'currency' || selectedType === 'number') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Currency Symbol / Unit Suffix
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="$"
                      className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                    <div className="flex gap-1">
                      {['$', '€', '£', '¥', 'pts', 'hrs'].map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => setUnit(sym)}
                          className={`px-2 py-1 rounded text-xs border ${
                            unit === sym 
                              ? 'border-indigo-500 bg-indigo-900/40 text-white' 
                              : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
                          }`}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Decimal Precision
                  </label>
                  <select
                    value={precision}
                    onChange={(e) => setPrecision(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                  >
                    <option value={0}>0 (e.g. $2,500)</option>
                    <option value={1}>1 decimal (e.g. $2,500.5)</option>
                    <option value={2}>2 decimals (e.g. $2,500.00)</option>
                  </select>
                </div>
              </div>
            )}

            {/* RATING SETTINGS */}
            {selectedType === 'rating' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Maximum Star Scale
                </label>
                <div className="flex gap-2">
                  {[3, 5, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMaxRating(num)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                        maxRating === num
                          ? 'border-amber-500 bg-amber-950/40 text-amber-300'
                          : 'border-slate-800 bg-slate-900 text-slate-400'
                      }`}
                    >
                      <Star size={13} className="fill-amber-400/40" />
                      <span>{num} Stars</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* DROPDOWN OPTIONS SETTINGS */}
            {selectedType === 'dropdown' && (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-slate-300">
                  Manage Select Options
                </label>
                <div className="flex flex-wrap gap-2">
                  {options.map((opt) => (
                    <span 
                      key={opt.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                      style={{ 
                        backgroundColor: `${opt.color}20`, 
                        borderColor: `${opt.color}60`, 
                        color: opt.color 
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: opt.color }} />
                      <span>{opt.label}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(opt.id)}
                        className="hover:opacity-75"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  {options.length === 0 && (
                    <span className="text-xs text-slate-500 italic">No options added yet.</span>
                  )}
                </div>

                {/* Add Option Row */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="New option label..."
                    value={newOptionLabel}
                    onChange={(e) => setNewOptionLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500"
                  />
                  <div className="flex gap-1 items-center">
                    {PRESET_COLORS.slice(0, 5).map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewOptionColor(color)}
                        className={`w-5 h-5 rounded-full border transition-transform ${
                          newOptionColor === color ? 'scale-125 border-white ring-1 ring-white/50' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="btn btn-secondary btn-sm flex items-center gap-1 px-3 py-1.5"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>
              </div>
            )}

            {/* FORMULA BUILDER SETTINGS */}
            {selectedType === 'formula' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">
                    Formula Expression
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Wrap field names in <code className="text-indigo-400 font-mono">&#123;Braces&#125;</code>
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    id="formula-expression-input"
                    rows={2}
                    value={formula}
                    onChange={(e) => setFormula(e.target.value)}
                    placeholder="e.g. {Budget} / ({Story Pts} * 100)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-mono text-emerald-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Token / Variable Quick Chips */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Click to Insert Available Fields & Operators:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {['Budget', 'Story Pts', 'Priority', 'Status', 'Duration'].map((field) => (
                      <button
                        key={field}
                        type="button"
                        onClick={() => handleInsertFormulaToken(`{${field}}`)}
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 hover:border-indigo-400 transition-colors"
                      >
                        &#123;{field}&#125;
                      </button>
                    ))}
                    {['+', '-', '*', '/', '(', ')'].map((op) => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => handleInsertFormulaToken(op)}
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700 hover:text-white"
                      >
                        {op}
                      </button>
                    ))}
                    {['ROUND()', 'IF()', 'MIN()', 'MAX()'].map((fn) => (
                      <button
                        key={fn}
                        type="button"
                        onClick={() => handleInsertFormulaToken(fn)}
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400"
                      >
                        {fn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Syntax Validation Status Card */}
                {formulaValidation && (
                  <div 
                    className={`p-2.5 rounded-xl text-xs border flex items-center justify-between ${
                      formulaValidation.isValid 
                        ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300' 
                        : 'border-rose-500/30 bg-rose-950/20 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {formulaValidation.isValid ? (
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle size={16} className="text-rose-400 shrink-0" />
                      )}
                      <span>
                        {formulaValidation.isValid 
                          ? 'Valid formula syntax' 
                          : formulaValidation.error}
                      </span>
                    </div>

                    {formulaValidation.isValid && formulaValidation.sampleResult !== undefined && (
                      <div className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-900/40 border border-emerald-500/40">
                        Live Preview: <strong>{String(formulaValidation.sampleResult)}{unit}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* COLUMN SUMMARY ROLLUP SELECTOR */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Summary Footer Rollup Aggregation
              </label>
              <select
                id="column-rollup-select"
                value={rollup}
                onChange={(e) => setRollup(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              >
                <option value="none">None (No footer summary)</option>
                <option value="sum">SUM — Total numeric sum</option>
                <option value="avg">AVERAGE — Mean calculation</option>
                <option value="min">MIN — Smallest value</option>
                <option value="max">MAX — Largest value</option>
                <option value="count_checked">COUNT CHECKED — Completed checkmarks</option>
              </select>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {isEditing && onDeleteColumn ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete column "${title}"?`)) {
                    onDeleteColumn(initialColumn!.id);
                    onClose();
                  }
                }}
                className="btn btn-ghost text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl"
              >
                <Trash2 size={14} /> Delete Column
              </button>
            ) : <div />}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                id="save-column-btn"
                type="submit"
                disabled={selectedType === 'formula' && formulaValidation?.isValid === false}
                className="btn btn-primary px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                <Check size={14} />
                {isEditing ? 'Save Changes' : 'Create Column'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

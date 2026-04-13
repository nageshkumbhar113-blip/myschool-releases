import { create } from 'zustand'
import schoolDataService from '../services/schoolDataService'
import { PRESETS } from '../utils/presets'

function getDefaultPageSize(type = 'admission') {
  return type === 'lc' || type === 'bonafide' ? 'A3' : 'A4'
}
const DEFAULT_MAPPING_PROPS = {
  width: 25,
  height: 5,
  fontSize: 12,
  fontWeight: 'normal',
  color: '#000000',
  zIndex: 1,
}

const useTemplateStore = create((set, get) => ({
  templates: [],
  activeTemplate: null,
  selectedFieldId: null,
  loading: false,

  loadTemplates: async (instituteId) => {
    set({ loading: true })
    try {
      const rows = await schoolDataService.templates.list(instituteId)
      set({ templates: rows, loading: false })
    } catch (err) {
      console.error('loadTemplates:', err)
      set({ loading: false })
    }
  },

  setActiveTemplate: (template) => set({ activeTemplate: template ? { ...template } : null, selectedFieldId: null }),

  createTemplate: async ({ instituteId, name = 'New Template', type = 'admission' }) => {
    const template = await schoolDataService.templates.create({
      instituteId,
      name,
      type,
      pageSize: getDefaultPageSize(type),
      backgroundImage: null,
      fieldMappings: [],
      excludedFieldKeys: [],
      isLocked: false,
    })
    set((state) => ({ templates: [...state.templates, template], activeTemplate: { ...template }, selectedFieldId: null }))
    return template
  },

  createPresetTemplate: async (instituteId, presetType, existingFields) => {
    const preset = PRESETS[presetType]
    if (!preset) return get().createTemplate({ instituteId })

    const fieldMappings = []
    const createdFields = []

    for (let i = 0; i < preset.fields.length; i += 1) {
      const pf = preset.fields[i]
      let field = existingFields.find((item) => item.key === pf.key)

      if (!field) {
        field = await schoolDataService.fields.create({
          label: pf.label,
          key: pf.key,
          type: pf.type,
          options: [],
          validation: {},
          meta: { system: false, order: existingFields.length + createdFields.length },
          instituteId,
        })
        createdFields.push(field)
      }

      fieldMappings.push({
        fieldId: field.id,
        x: pf.x,
        y: pf.y,
        width: pf.w,
        height: pf.h,
        fontSize: pf.fontSize ?? 12,
        fontWeight: pf.fontWeight ?? 'normal',
        color: '#000000',
        zIndex: i + 1,
        fieldSource: pf.fieldSource ?? 'student',
        inputType: pf.inputType ?? 'text',
        required: pf.required ?? false,
      })
    }

    const template = await schoolDataService.templates.create({
      instituteId,
      name: preset.name,
      type: presetType,
      pageSize: getDefaultPageSize(presetType),
      backgroundImage: null,
      fieldMappings,
      excludedFieldKeys: [],
      isLocked: false,
    })

    set((state) => ({ templates: [...state.templates, template], activeTemplate: { ...template }, selectedFieldId: null }))
    return { template, createdFields }
  },

  saveTemplate: async () => {
    const template = get().activeTemplate
    if (!template) return null
    const saved = await schoolDataService.templates.save(template)
    set((state) => ({
      templates: state.templates.map((item) => (item.id === saved.id ? { ...saved } : item)),
      activeTemplate: { ...saved },
    }))
    return saved
  },

  updateActiveTemplate: (changes) => set((state) => ({
    activeTemplate: state.activeTemplate ? { ...state.activeTemplate, ...changes } : null,
  })),

  deleteTemplate: async (id) => {
    await schoolDataService.templates.delete(id)
    set((state) => ({
      templates: state.templates.filter((template) => template.id !== id),
      activeTemplate: state.activeTemplate?.id === id ? null : state.activeTemplate,
      selectedFieldId: null,
    }))
  },

  markTemplateActive: async (templateId) => {
    const updated = await schoolDataService.templates.markActive(templateId)
    set((state) => ({
      templates: state.templates.map((template) => {
        if (template.instituteId !== updated.instituteId || template.type !== updated.type) return template
        return { ...template, isActive: template.id === templateId }
      }),
      activeTemplate: state.activeTemplate ? { ...state.activeTemplate, isActive: state.activeTemplate.id === templateId } : null,
    }))
  },

  clearTemplateActive: async (templateId) => {
    await schoolDataService.templates.clearActive(templateId)
    set((state) => {
      const target = state.templates.find((template) => template.id === templateId)
      return {
        templates: state.templates.map((template) => {
          if (!target || template.instituteId !== target.instituteId || template.type !== target.type) return template
          return { ...template, isActive: false }
        }),
        activeTemplate: state.activeTemplate ? { ...state.activeTemplate, isActive: false } : null,
      }
    })
  },

  setSelectedField: (fieldId) => set({ selectedFieldId: fieldId }),

  addFieldToCanvas: (field) => {
    set((state) => {
      if (!state.activeTemplate) return {}
      if (state.activeTemplate.fieldMappings.some((mapping) => mapping.fieldId === field.id)) return {}
      const count = state.activeTemplate.fieldMappings.length
      const newMapping = {
        fieldId: field.id,
        x: 10,
        y: Math.min(10 + count * 7, 90),
        ...DEFAULT_MAPPING_PROPS,
        zIndex: count + 1,
      }
      return {
        activeTemplate: { ...state.activeTemplate, fieldMappings: [...state.activeTemplate.fieldMappings, newMapping] },
        selectedFieldId: field.id,
      }
    })
  },

  removeFieldFromCanvas: (fieldId) => {
    set((state) => {
      if (!state.activeTemplate) return {}
      return {
        activeTemplate: { ...state.activeTemplate, fieldMappings: state.activeTemplate.fieldMappings.filter((mapping) => mapping.fieldId !== fieldId) },
        selectedFieldId: state.selectedFieldId === fieldId ? null : state.selectedFieldId,
      }
    })
  },

  updateFieldMapping: (fieldId, changes) => {
    set((state) => {
      if (!state.activeTemplate) return {}
      return {
        activeTemplate: {
          ...state.activeTemplate,
          fieldMappings: state.activeTemplate.fieldMappings.map((mapping) => (mapping.fieldId === fieldId ? { ...mapping, ...changes } : mapping)),
        },
      }
    })
  },

  bringForward: (fieldId) => {
    set((state) => {
      if (!state.activeTemplate) return {}
      const mappings = state.activeTemplate.fieldMappings
      const maxZ = Math.max(...mappings.map((mapping) => mapping.zIndex ?? 1))
      return {
        activeTemplate: {
          ...state.activeTemplate,
          fieldMappings: mappings.map((mapping) => (mapping.fieldId === fieldId ? { ...mapping, zIndex: Math.min((mapping.zIndex ?? 1) + 1, maxZ + 1) } : mapping)),
        },
      }
    })
  },

  sendBackward: (fieldId) => {
    set((state) => {
      if (!state.activeTemplate) return {}
      return {
        activeTemplate: {
          ...state.activeTemplate,
          fieldMappings: state.activeTemplate.fieldMappings.map((mapping) => (mapping.fieldId === fieldId ? { ...mapping, zIndex: Math.max((mapping.zIndex ?? 1) - 1, 1) } : mapping)),
        },
      }
    })
  },

  toggleLock: () => set((state) => ({
    activeTemplate: state.activeTemplate ? { ...state.activeTemplate, isLocked: !state.activeTemplate.isLocked } : null,
  })),
}))

export default useTemplateStore

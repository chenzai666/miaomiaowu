import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ChevronDown, ChevronUp, Trash2, GripVertical, Link2, Variable, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { KeywordFilterInput } from './keyword-filter-input'
import { ProxyTypeSelect } from './proxy-type-select'
import { ProxyGroupSelect } from './proxy-group-select'
import {
  PROXY_GROUP_TYPES,
  hasProxyNodes,
  hasProxyProviders,
  type ProxyGroupFormState,
  type ProxyGroupType,
} from '@/lib/template-v3-utils'

interface ProxyGroupEditorProps {
  group: ProxyGroupFormState
  index: number
  allGroupNames: string[]
  onChange: (index: number, group: ProxyGroupFormState) => void
  onDelete: (index: number) => void
  onMoveUp?: (index: number) => void
  onMoveDown?: (index: number) => void
  isFirst?: boolean
  isLast?: boolean
  showRegionToggle?: boolean
  isRegionGroup?: boolean
  variables?: Record<string, string> // 模板自定义变量
}

const GROUP_TYPE_LABELS: Record<ProxyGroupType, string> = {
  'select': '手动选择',
  'url-test': '自动测速',
  'fallback': '故障转移',
  'load-balance': '负载均衡',
  'relay': '链式代理',
}

export function ProxyGroupEditor({
  group,
  index,
  allGroupNames,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  showRegionToggle = true,
  isRegionGroup = false,
  variables,
}: ProxyGroupEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showRelayPicker, setShowRelayPicker] = useState(false)

  const updateField = <K extends keyof ProxyGroupFormState>(
    field: K,
    value: ProxyGroupFormState[K]
  ) => {
    onChange(index, { ...group, [field]: value })
  }

  const needsUrlTestOptions = ['url-test', 'fallback', 'load-balance'].includes(group.type)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={`border rounded-lg ${group.hidden ? 'opacity-60' : ''}`}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50">
            <div className="flex items-center gap-3">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              {group.icon && (
                /^https?:\/\//.test(group.icon)
                  ? <img src={group.icon} alt="" className="h-5 w-5 object-contain" />
                  : <span className="text-base leading-none">{group.icon}</span>
              )}
              <span className="font-medium">{group.name}</span>
              <Badge variant="outline" className="text-xs">
                {GROUP_TYPE_LABELS[group.type]}
              </Badge>
              {group.hidden && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <EyeOff className="h-3 w-3" />
                  已隐藏
                </Badge>
              )}
              {group.filterKeywords && (
                <Badge variant="secondary" className="text-xs">有过滤</Badge>
              )}
              {group.dialerProxyGroup && (
                <Badge
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-secondary/80"
                  onClick={(e) => { e.stopPropagation(); setShowRelayPicker(!showRelayPicker) }}
                >
                  中转: {group.dialerProxyGroup}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${group.dialerProxyGroup ? 'text-primary' : 'text-muted-foreground'}`}
                title={group.dialerProxyGroup ? `中转: ${group.dialerProxyGroup}` : '设置中转代理组'}
                onClick={(e) => { e.stopPropagation(); setShowRelayPicker(!showRelayPicker) }}
              >
                <Link2 className="h-4 w-4" />
              </Button>
              {onMoveUp && !isFirst && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => { e.stopPropagation(); onMoveUp(index) }}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              )}
              {onMoveDown && !isLast && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => { e.stopPropagation(); onMoveDown(index) }}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(index) }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </CollapsibleTrigger>

        {showRelayPicker && (
          <div className="px-3 pb-3 border-t">
            <div className="flex items-center justify-between pt-3 pb-2">
              <span className="text-xs text-muted-foreground">选择中转代理组</span>
              {group.dialerProxyGroup && (
                <Badge
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => updateField('dialerProxyGroup', '')}
                >
                  清除
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {allGroupNames.filter(n => n !== group.name).map(n => (
                <Badge
                  key={n}
                  variant={group.dialerProxyGroup === n ? "default" : "outline"}
                  className={`cursor-pointer justify-center py-1.5 transition-colors ${
                    group.dialerProxyGroup === n ? '' : 'hover:bg-accent'
                  }`}
                  onClick={() => updateField('dialerProxyGroup', group.dialerProxyGroup === n ? '' : n)}
                >
                  {n}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4 border-t">
            {/* Row 1: Name and Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>组名称</Label>
                <Input
                  value={group.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="代理组名称"
                />
              </div>
              <div className="space-y-2">
                <Label>组类型</Label>
                <Select
                  value={group.type}
                  onValueChange={(v) => updateField('type', v as ProxyGroupType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROXY_GROUP_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {GROUP_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Include Options */}
            <div className="space-y-2">
              <Label>节点来源</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={group.includeAll}
                    onCheckedChange={(v) => {
                      onChange(index, {
                        ...group,
                        includeAll: v,
                        includeAllProxies: v,
                        includeAllProviders: v,
                      })
                    }}
                  />
                  <span className="text-sm">代理集合+节点</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={group.includeAllProxies}
                    onCheckedChange={(v) => {
                      const newIncludeAll = v && group.includeAllProviders
                      onChange(index, {
                        ...group,
                        includeAllProxies: v,
                        includeAll: v ? newIncludeAll : false,
                      })
                    }}
                  />
                  <span className="text-sm">代理节点</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={group.includeAllProviders}
                    onCheckedChange={(v) => {
                      const newIncludeAll = v && group.includeAllProxies
                      onChange(index, {
                        ...group,
                        includeAllProviders: v,
                        includeAll: v ? newIncludeAll : false,
                      })
                    }}
                  />
                  <span className="text-sm">代理集合</span>
                </div>
                {showRegionToggle && !isRegionGroup && (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={group.includeRegionProxyGroups}
                      onCheckedChange={(v) => updateField('includeRegionProxyGroups', v)}
                    />
                    <span className="text-sm">区域代理组</span>
                  </div>
                )}
              </div>
            </div>

            {/* Row 2.5: Proxy Order (groups, nodes, providers) */}
            <ProxyGroupSelect
              label="代理顺序 (拖拽排序)"
              value={group.proxyOrder}
              onChange={(v) => updateField('proxyOrder', v)}
              availableGroups={allGroupNames.filter(n => n !== group.name)}
              showNodesMarker={hasProxyNodes(group)}
              showProvidersMarker={hasProxyProviders(group)}
              showRegionGroupsMarker={group.includeRegionProxyGroups}
              placeholder="选择要引用的代理组"
            />

            {/* 模板变量提示 */}
            {variables && Object.keys(variables).length > 0 && (
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs cursor-help border-dashed border-amber-500 text-amber-600 dark:text-amber-400 gap-1">
                        <Variable className="h-3 w-3" />
                        模板变量 ({Object.keys(variables).length})
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-md">
                      <div className="space-y-1 text-xs">
                        {Object.entries(variables).map(([name, value]) => (
                          <div key={name} className="flex gap-2">
                            <span className="font-mono font-semibold">{name}</span>
                            <span className="truncate max-w-[300px]">{value}</span>
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            {/* Row 3-4: Filter Keywords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KeywordFilterInput
                label="筛选关键词 (filter)"
                value={group.filterKeywords}
                onChange={(v) => updateField('filterKeywords', v)}
                onVariableCleared={() => updateField('filterFromVariable', undefined)}
                placeholder="香港, HK, 港"
                description="匹配节点名称，用逗号分隔"
                fromVariable={group.filterFromVariable}
              />
              <KeywordFilterInput
                label="排除关键词 (exclude-filter)"
                value={group.excludeFilterKeywords}
                onChange={(v) => updateField('excludeFilterKeywords', v)}
                onVariableCleared={() => updateField('excludeFilterFromVariable', undefined)}
                placeholder="游戏, IPLC"
                description="排除匹配的节点"
                fromVariable={group.excludeFilterFromVariable}
              />
            </div>

            {/* Row 5: Type Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ProxyTypeSelect
                label="包含类型 (include-type)"
                value={group.includeTypes}
                onChange={(v) => updateField('includeTypes', v)}
                placeholder="选择要包含的代理类型"
              />
              <ProxyTypeSelect
                label="排除类型 (exclude-type)"
                value={group.excludeTypes}
                onChange={(v) => updateField('excludeTypes', v)}
                placeholder="选择要排除的代理类型"
              />
            </div>

            {/* Row 6: URL Test Options */}
            {needsUrlTestOptions && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>测试 URL</Label>
                  <Input
                    value={group.url}
                    onChange={(e) => updateField('url', e.target.value)}
                    placeholder="https://www.gstatic.com/generate_204"
                  />
                </div>
                <div className="space-y-2">
                  <Label>测试间隔 (秒)</Label>
                  <Input
                    type="number"
                    value={group.interval}
                    onChange={(e) => updateField('interval', parseInt(e.target.value) || 300)}
                  />
                </div>
                {group.type !== 'load-balance' && (
                  <div className="space-y-2">
                    <Label>容差 (ms)</Label>
                    <Input
                      type="number"
                      value={group.tolerance}
                      onChange={(e) => updateField('tolerance', parseInt(e.target.value) || 50)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Row 7: Icon and Hidden */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>图标 (icon)</Label>
                <Input
                  value={group.icon}
                  onChange={(e) => updateField('icon', e.target.value)}
                  placeholder="URL 或 emoji"
                />
              </div>
              <div className="flex items-center gap-2 sm:pt-8">
                <Switch
                  checked={group.hidden}
                  onCheckedChange={(v) => updateField('hidden', v)}
                />
                <span className="text-sm">隐藏此组 (hidden)</span>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import { ResourcesApi } from '../../services/api'
import { API_ORIGIN } from '../../services/api'

export default function ResourceDetail() {
  const { id } = useParams()
  const [count, setCount] = useState(0)
  const [meta, setMeta] = useState<any>({ title: '', uploader: { name: '' }, size: '', type: '', summary: '', fileUrl: '' })
  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const r = await ResourcesApi.detail(id)
        setMeta({ title: r.title, uploader: { name: '系统' }, size: r.size, type: r.type, summary: r.summary, fileUrl: r.fileUrl || '' })
        setCount(r.downloadCount || 0)
      } catch {}
    }
    load()
  }, [id])
  const download = async () => {
    if (!id) return
    try {
      const d = await ResourcesApi.downloadLog(id)
      setCount(d.downloadCount || count + 1)
    } catch {}
  }
  return (
    <div>
      <PageHeader title="资源详情" subtitle={meta.title} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-2">
          <div className="text-gray-800">{meta.summary}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-gray-600">上传者：{meta.uploader.name}</div>
          <div className="text-sm text-gray-600 mt-1">类型：{meta.type}</div>
          <div className="text-sm text-gray-600 mt-1">大小：{meta.size}</div>
          <div className="text-sm text-gray-600 mt-1">下载次数：{count}</div>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={download} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">记录下载</button>
            {meta.fileUrl && (
              <a href={`${API_ORIGIN}${meta.fileUrl}`} target="_blank" rel="noreferrer" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">打开文件</a>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

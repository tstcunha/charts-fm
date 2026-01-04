'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ChartExampleProps {
  data: Array<{
    name: string
    plays: number
  }>
}

export default function ChartExample({ data }: ChartExampleProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="plays" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  )
}


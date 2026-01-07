'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { Link } from '@/i18n/routing'

export default function CreateUserForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    lastfmUsername: '',
    lastfmSessionKey: '',
    image: '',
    isSuperuser: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsSubmitting(true)

    // Validation
    if (!formData.email || !formData.lastfmUsername) {
      setError('Email and Last.fm username are required')
      setIsSubmitting(false)
      return
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address')
      setIsSubmitting(false)
      return
    }

    // Validate password if provided
    if (formData.password) {
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters')
        setIsSubmitting(false)
        return
      }

      // Check for at least one special character
      const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/~`]/
      if (!specialCharRegex.test(formData.password)) {
        setError('Password must contain at least one special character')
        setIsSubmitting(false)
        return
      }
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name || null,
          password: formData.password || null,
          lastfmUsername: formData.lastfmUsername,
          lastfmSessionKey: formData.lastfmSessionKey || null,
          image: formData.image || null,
          isSuperuser: formData.isSuperuser,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      setSuccess(true)
      setFormData({
        email: '',
        name: '',
        password: '',
        lastfmUsername: '',
        lastfmSessionKey: '',
        image: '',
        isSuperuser: false,
      })

      // Optionally redirect after a delay
      setTimeout(() => {
        router.push('/admin/users/create')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="mb-8">
        <Link 
          href="/dashboard" 
          className="text-yellow-600 hover:text-yellow-700 mb-4 inline-block"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold mb-2">Create New User</h1>
        <p className="text-gray-600">Superuser-only page for creating users manually</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          User created successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            placeholder="User Name"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            placeholder="Leave empty if no password needed"
          />
          <p className="mt-1 text-sm text-gray-500">
            If left empty, user will not be able to log in with email/password. If provided, password must be at least 8 characters with 1 special character.
          </p>
        </div>

        <div>
          <label htmlFor="lastfmUsername" className="block text-sm font-medium text-gray-700 mb-1">
            Last.fm Username <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="lastfmUsername"
            name="lastfmUsername"
            value={formData.lastfmUsername}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            placeholder="lastfm_username"
          />
        </div>

        <div>
          <label htmlFor="lastfmSessionKey" className="block text-sm font-medium text-gray-700 mb-1">
            Last.fm Session Key
          </label>
          <input
            type="text"
            id="lastfmSessionKey"
            name="lastfmSessionKey"
            value={formData.lastfmSessionKey}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            placeholder="Leave empty if no session key available"
          />
          <p className="mt-1 text-sm text-gray-500">
            Session key for authenticated Last.fm API calls
          </p>
        </div>

        <div>
          <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
            Image URL
          </label>
          <input
            type="url"
            id="image"
            name="image"
            value={formData.image}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            placeholder="https://example.com/avatar.jpg"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isSuperuser"
            name="isSuperuser"
            checked={formData.isSuperuser}
            onChange={handleChange}
            className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
          />
          <label htmlFor="isSuperuser" className="ml-2 block text-sm text-gray-700">
            Grant superuser access
          </label>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-yellow-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create User'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}


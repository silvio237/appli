'use client'

import React, { useEffect, useRef, useState } from 'react'
import Wrapper from '@/app/components/Wrapper'
import Notification from '@/app/components/Notification'
import FileUpload from '@/app/components/FileUpload'
import { useEdgeStore } from '@/lib/edgestore'
import { FileInput, Trash2, Users } from 'lucide-react'
import Image from 'next/image'

interface PageProps {
  params: {
    companyId: string
  }
}

const Page: React.FC<PageProps> = ({ params }) => {
  const { edgestore } = useEdgeStore()

  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState('')
  const [description, setDescription] = useState('')
  const [progress, setProgress] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<any[]>([])
  const [companyName, setCompanyName] = useState('')
  const [notification, setNotification] = useState<string>('')

  const closeNotification = () => {
    setNotification('')
  }

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile)
  }

  const handleUpload = async () => {
    if (!name || !capacity || !description) {
      setNotification('Tous les champs sont obligatoires')
      return
    }

    try {
      let imageUrl = ''
      if (file) {
        const uploadResult = await edgestore.publicFiles.upload({
          file,
          onProgressChange: setProgress,
        })
        imageUrl = uploadResult.url
      }

      const apiResponse = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          capacity: parseInt(capacity), // 🔧 force en nombre
          description,
          companyId: params.companyId,
          imageUrl,
        }),
      })

      if (!apiResponse.ok) {
        const error = await apiResponse.json()
        setNotification(error.message || "Erreur lors de la création.")
        return
      }

      setNotification('Salle créée avec succès !')
      setName('')
      setCapacity('')
      setDescription('')
      setFile(null)
      setProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
      fetchRooms()
    } catch (error) {
      console.error(error)
      setNotification("Une erreur est survenue lors de la création.")
    }
  }

  const handleDelete = async (roomId: string, imageUrl: string) => {
    const confirmed = confirm('Êtes-vous sûr de vouloir supprimer cette salle ?')
    if (!confirmed) return

    try {
      if (imageUrl) {
        await edgestore.publicFiles.delete({ url: imageUrl })
      }

      const response = await fetch('/api/rooms', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      })

      if (!response.ok) {
        const error = await response.json()
        setNotification(error.message || "Erreur lors de la suppression.")
        return
      }

      setNotification('Salle supprimée avec succès !')
      fetchRooms()
    } catch (error) {
      console.error(error)
      setNotification("Une erreur est survenue lors de la suppression.")
    }
  }

  const fetchRooms = async () => {
    try {
      const response = await fetch(`/api/rooms?companyId=${params.companyId}`)
      const data = await response.json()

      setRooms(data.rooms || [])
      setCompanyName(data.companyName || '')
      setLoading(false)
    } catch (error) {
      console.error('Erreur de récupération des salles:', error)
    }
  }

  useEffect(() => {
    fetchRooms()
  }, [params.companyId])

  return (
    <Wrapper>
      {notification && (
        <Notification message={notification} onclose={closeNotification} />
      )}

      {loading ? (
        <div className='text-center mt-32'>
          <span className='loading loading-spinner loading-lg'></span>
        </div>
      ) : (
        <div>
          <div className='badge badge-secondary badge-outline mb-2'>
            {companyName}
          </div>

          <div className='flex flex-col-reverse md:flex-row'>
            <section className='w-full'>
              <h1 className='text-2xl font-bold mb-4'>Liste des salles</h1>
              <ul>
                {rooms.length > 0 ? (
                  rooms.map((room) => (
                    <li key={room.id} className='flex flex-col md:flex-row md:items-center mb-5 border-base-300 border p-5 rounded-2xl w-full min-h-60'>
                      <Image
                        src={room.imgUrl || '/placeholder.jpg'}
                        alt={room.name}
                        width={400}
                        height={400}
                        quality={100}
                        className='shadow-sm w-full mb-4 md:mb-0 md:w-1/3 md:h-full object-cover rounded-xl'
                      />
                      <div className='md:ml-4 md:w-2/3'>
                        <div className='flex items-center'>
                          <div className='badge badge-secondary'>
                            <Users className='mr-2 w-4' />
                            {room.capacity}
                          </div>
                          <h1 className='font-bold text-xl ml-2'>{room.name}</h1>
                        </div>
                        <p className='text-sm my-2 text-gray-500'>{room.description}</p>
                        <button
                          onClick={() => handleDelete(room.id, room.imgUrl)}
                          className='btn mt-2 btn-secondary btn-outline btn-sm'
                        >
                          <Trash2 className='w-4' />
                        </button>
                      </div>
                    </li>
                  ))
                ) : (
                  <p>Votre Entreprise n'a aucune salle de réunion.</p>
                )}
              </ul>
            </section>

            <button
              className='btn mt-2 btn-outline btn-secondary w-fit mb-2 md:hidden flex'
              onClick={() =>
                (document.getElementById('my_modal') as HTMLDialogElement)?.showModal()
              }
            >
              Ajouter une salle
            </button>

            <dialog id='my_modal' className='modal'>
              <div className='modal-box'>
                <form method='dialog'>
                  <button className='btn btn-sm btn-circle btn-ghost absolute right-2 top-2'>
                    ✕
                  </button>
                </form>
                <CreateRoomForm
                  name={name}
                  setName={setName}
                  capacity={capacity}
                  setCapacity={setCapacity}
                  description={description}
                  setDescription={setDescription}
                  file={file}
                  progress={progress}
                  handleFileChange={handleFileChange}
                  handleUpload={handleUpload}
                />
              </div>
            </dialog>

            <section className='w-[450px] ml-8 hidden md:block'>
              <CreateRoomForm
                name={name}
                setName={setName}
                capacity={capacity}
                setCapacity={setCapacity}
                description={description}
                setDescription={setDescription}
                file={file}
                progress={progress}
                handleFileChange={handleFileChange}
                handleUpload={handleUpload}
              />
            </section>
          </div>
        </div>
      )}
    </Wrapper>
  )
}

interface FormProps {
  name: string
  setName: (val: string) => void
  capacity: string
  setCapacity: (val: string) => void
  description: string
  setDescription: (val: string) => void
  file: File | null
  progress: number
  handleFileChange: (file: File | null) => void
  handleUpload: () => void
}

const CreateRoomForm: React.FC<FormProps> = ({
  name,
  setName,
  capacity,
  setCapacity,
  description,
  setDescription,
  file,
  progress,
  handleFileChange,
  handleUpload,
}) => {
  return (
    <>
      <h1 className='text-2xl mb-4'>Créer une Salle</h1>
      <input
        type='text'
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder='Nom de la salle'
        className='input input-bordered w-full mb-4'
      />
      <input
        type='number'
        value={capacity}
        onChange={(e) => setCapacity(e.target.value)}
        placeholder='Capacité de la salle'
        className='input input-bordered w-full mb-4'
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder='Description de la salle'
        className='textarea textarea-bordered w-full mb-4'
      />
      <div className='p-5 rounded-lg bg-secondary/5 border border-base-300'>
        <FileUpload onFilechange={handleFileChange} buttonLabel='Image de la Salle' />
        {file && (
          <p className='border border-base-300 p-3 mt-4 rounded-lg'>
            <span className='text-sm'>{file.name}</span>
            {progress > 0 && (
              <p>
                <progress
                  className='progress progress-secondary w-56'
                  value={progress}
                  max='100'
                ></progress>
                <span className='text-sm'>{progress}%</span>
              </p>
            )}
          </p>
        )}
      </div>
      <button
        className='btn mt-4 btn-secondary btn-outline btn-sm'
        onClick={handleUpload}
      >
        Créer Salle
      </button>
    </>
  )
}

export default Page

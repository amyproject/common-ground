import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    const element = dialog.current!
    const previous = document.activeElement as HTMLElement | null
    element.showModal()
    return () => {
      element.close()
      if (previous?.isConnected && previous !== document.body) previous.focus()
      else document.querySelector<HTMLElement>('main h1')?.focus()
    }
  }, [])
  return <dialog ref={dialog} className={`modal ${wide ? 'modal-wide' : ''}`} aria-label={title} onCancel={(event) => {
    event.preventDefault()
    closeRef.current()
  }} onClick={(event) => {
    if (event.target === dialog.current) {
      const bounds = dialog.current.getBoundingClientRect()
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
    }
  }}>
    <div className="modal-top"><span className="eyebrow">Common Ground</span><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={21} /></button></div>
    {children}
  </dialog>
}

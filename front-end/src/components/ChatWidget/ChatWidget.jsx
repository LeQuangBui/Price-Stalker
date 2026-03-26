import { useState } from 'react'
import './ChatWidget.css'

export default function AIChatBox() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Hi, I’m your PriceStalker assistant. Ask me about products, prices, or tracking.'
    }
  ])
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim()) return

    const currentInput = input

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: currentInput
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    // Modify the endpoint later 
    try {
      const response = await fetch('http://localhost:8080/chat', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: currentInput })
      })

      const data = await response.json()

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: data.reply || 'Sorry, I could not process that.'
        }
      ])
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: 'Server error. Please try again.'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend()
    }
  }

  return (
    <div className="ai-chatbox-wrapper">
      {!isOpen && (
        <button
          className="ai-chatbox-toggle"
          onClick={() => setIsOpen(true)}
        >
          Help
        </button>
      )}

      {isOpen && (
        <div className="ai-chatbox">
          <div className="ai-chatbox-header">
            <div>
              <h3>PriceStalker AI</h3>
              <p>Search, compare, track</p>
            </div>

            <button
              className="ai-chatbox-close"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="ai-chatbox-messages">
            {messages.map(message => (
              <div
                key={message.id}
                className={`ai-message ${message.sender === 'user' ? 'user' : 'bot'}`}
              >
                {message.text}
              </div>
            ))}

            {loading && (
              <div className="ai-message bot">
                Thinking...
              </div>
            )}
          </div>

          <div className="ai-chatbox-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask PriceStalker..."
            />
            <button onClick={handleSend}>Send</button>
          </div>
        </div>
      )}
    </div>
  )
}
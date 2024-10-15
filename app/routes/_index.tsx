import { json, type MetaFunction } from '@remix-run/cloudflare';
import { useState } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';

export const meta: MetaFunction = () => {
  return [{ title: 'MTS' }, { name: 'description', content: 'Prototype builder' }];
};

export const loader = () => json({});
export default function Index() {
  const [model, setModel] = useState('gpt-4o');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (message) => {
    setIsLoading(true);
    // Logic to send message and update state
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full w-full">
      <Header />
      <ClientOnly
        fallback={
          <BaseChat
            model={model}
            setModel={setModel}
            messages={messages}
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            handleSendMessage={handleSendMessage}
          />
        }
      >
        {() => (
          <Chat
            model={model}
            setModel={setModel}
            messages={messages}
            setMessages={setMessages}
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            handleSendMessage={handleSendMessage}
          />
        )}
      </ClientOnly>
    </div>
  );
}

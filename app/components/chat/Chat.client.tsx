// @ts-nocheck
// Preventing TS checks with files presented in the video for a better presentation.
import { useStore } from '@nanostores/react';
import type { Message } from 'ai';
import { useChat } from 'ai/react';
import { useAnimate } from 'framer-motion';
import { memo, useEffect, useRef, useState } from 'react';
import { cssTransition, toast, ToastContainer } from 'react-toastify';
import { useMessageParser, usePromptEnhancer, useShortcuts, useSnapScroll } from '~/lib/hooks';
import { useChatHistory } from '~/lib/persistence';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { fileModificationsToHTML } from '~/utils/diff';
import { DEFAULT_MODEL } from '~/utils/constants';
import { cubicEasingFn } from '~/utils/easings';
import { createScopedLogger, renderLogger } from '~/utils/logger';
import { BaseChat } from './BaseChat';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

const logger = createScopedLogger('Chat');

export function Chat() {
  renderLogger.trace('Chat');

  const { ready, initialMessages, storeMessageHistory } = useChatHistory();
  const [messages, setMessages] = useState(initialMessages || []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSendMessage = async () => {
    if (input.trim() === '' || isLoading) {
      return;
    }

    setIsLoading(true);
    const newMessage = { role: 'user', content: input };
    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setInput('');

    try {
      /*
       * Here you would typically send the message to your AI service
       * and get a response. For now, we'll just simulate a delay
       */
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const aiResponse = { role: 'assistant', content: 'This is a simulated AI response.' };
      setMessages((prevMessages) => [...prevMessages, aiResponse]);
      await storeMessageHistory([...messages, newMessage, aiResponse]);
    } catch {
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {ready && (
        <ChatImpl
          messages={messages}
          input={input}
          onInputChange={handleInputChange}
          onSendMessage={handleSendMessage}
          storeMessageHistory={storeMessageHistory}
        />
      )}
      <ToastContainer
        closeButton={({ closeToast }) => {
          return (
            <button className="Toastify__close-button" onClick={closeToast}>
              <div className="i-ph:x text-lg" />
            </button>
          );
        }}
        icon={({ type }) => {
          /**
           * @todo Handle more types if we need them. This may require extra color palettes.
           */
          switch (type) {
            case 'success': {
              return <div className="i-ph:check-bold text-bolt-elements-icon-success text-2xl" />;
            }
            case 'error': {
              return <div className="i-ph:warning-circle-bold text-bolt-elements-icon-error text-2xl" />;
            }
          }

          return undefined;
        }}
        position="bottom-right"
        pauseOnFocusLoss
        transition={toastAnimation}
      />
    </>
  );
}

interface ChatProps {
  initialMessages: Message[];
  storeMessageHistory: (messages: Message[]) => Promise<void>;
  input: string;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSendMessage: () => Promise<void>;
}

export const ChatImpl = memo(
  ({ initialMessages = [], storeMessageHistory, input, onInputChange, onSendMessage }: ChatProps) => {
    const [isLoading, setIsLoading] = useState(false);

    if (typeof storeMessageHistory !== 'function') {
      throw new Error('storeMessageHistory must be a function');
    }

    if (!Array.isArray(initialMessages)) {
      throw new Error('initialMessages must be an array');
    }

    if (typeof input !== 'string') {
      throw new Error('input must be a string');
    }

    if (typeof onInputChange !== 'function') {
      throw new Error('onInputChange must be a function');
    }

    if (typeof onSendMessage !== 'function') {
      throw new Error('onSendMessage must be a function');
    }

    try {
      // Validate initialMessages structure
      initialMessages.forEach((message) => {
        if (typeof message.role !== 'string' || typeof message.content !== 'string') {
          throw new Error('Each message in initialMessages must have a role and content of type string');
        }
      });
    } catch (error) {
      console.error('Error in initialMessages:', error);
      toast.error('Invalid initial messages format');
    }

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (error) {
        toast.error(error);
        setError(null);
      }
    }, [error]);

    const handleError = (errorMessage: string) => {
      setError(errorMessage);
    };

    const resetState = () => {
      setError(null);
      setIsLoading(false);
    };

    useShortcuts();

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [chatStarted, setChatStarted] = useState(initialMessages.length > 0);
    const [model, setModel] = useState(DEFAULT_MODEL);

    const { showChat } = useStore(chatStore);

    const [animationScope, animate] = useAnimate();

    const { messages, stop, append } = useChat({
      api: '/api/chat',
      onError: (error) => {
        logger.error('Request failed\n\n', error);
        toast.error('There was an error processing your request');
      },
      onFinish: () => {
        logger.debug('Finished streaming');
      },
      initialMessages,
    });

    const { enhancingPrompt, promptEnhanced, enhancePrompt, resetEnhancer } = usePromptEnhancer();
    const { parsedMessages, parseMessages } = useMessageParser();

    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

    useEffect(() => {
      chatStore.setKey('started', initialMessages.length > 0);
    }, []);

    useEffect(() => {
      parseMessages(messages, isLoading);

      if (messages.length > initialMessages.length) {
        storeMessageHistory(messages).catch((error) => toast.error(error.message));
      }
    }, [messages, isLoading, parseMessages, storeMessageHistory, initialMessages.length]);

    const scrollTextArea = () => {
      const textarea = textareaRef.current;

      if (textarea) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    };

    const abort = () => {
      stop();
      chatStore.setKey('aborted', true);
      workbenchStore.abortAllActions();
    };

    useEffect(() => {
      const textarea = textareaRef.current;

      if (textarea) {
        textarea.style.height = 'auto';

        const scrollHeight = textarea.scrollHeight;

        textarea.style.height = `${Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
        textarea.style.overflowY = scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
      }
    }, [input, textareaRef]);

    const runAnimation = async () => {
      if (chatStarted) {
        return;
      }

      const examplesElement = document.querySelector('#examples');
      const introElement = document.querySelector('#intro');

      const animations = [];

      if (examplesElement) {
        animations.push(animate('#examples', { opacity: 0, display: 'none' }, { duration: 0.1 }));
      }

      if (introElement) {
        animations.push(animate('#intro', { opacity: 0, flex: 1 }, { duration: 0.2, ease: cubicEasingFn }));
      }

      await Promise.all(animations);

      chatStore.setKey('started', true);

      setChatStarted(true);
    };

    const sendMessage = async (_event: React.UIEvent, messageInput?: string) => {
      const _input = messageInput || input;

      if (_input.trim().length === 0 || isLoading) {
        return;
      }

      if (!chatStarted) {
        setChatStarted(true);
        await runAnimation();
      }

      setIsLoading(true);

      try {
        // save files before sending message
        await workbenchStore.saveAllFiles();

        const fileModifications = workbenchStore.getFileModifcations();
        chatStore.setKey('aborted', false);

        let messageContent = `[Model: ${model}]\n\n${_input}`;

        if (fileModifications !== undefined) {
          const diff = fileModificationsToHTML(fileModifications);
          messageContent = `[Model: ${model}]\n\n${diff}\n\n${_input}`;
          workbenchStore.resetAllFileModifications();
        }

        // trigger API request using append
        const newMessage = { role: 'user', content: messageContent };
        append(newMessage);

        // store the updated message history
        await storeMessageHistory([...messages, newMessage]);

        resetEnhancer();
        textareaRef.current?.blur();
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
      } finally {
        setIsLoading(false);
        onInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLTextAreaElement>);
      }
    };

    const [messageRef, scrollRef] = useSnapScroll();

    return (
      <BaseChat
        ref={animationScope}
        textareaRef={textareaRef}
        input={input}
        showChat={showChat}
        chatStarted={chatStarted}
        isStreaming={isLoading}
        enhancingPrompt={enhancingPrompt}
        promptEnhanced={promptEnhanced}
        sendMessage={sendMessage}
        model={model}
        setModel={setModel}
        messageRef={messageRef}
        scrollRef={scrollRef}
        handleInputChange={onInputChange}
        handleStop={abort}
        messages={messages.map((message, i) => {
          if (message.role === 'user') {
            return message;
          }

          return {
            ...message,
            content: parsedMessages[i] || '',
          };
        })}
        enhancePrompt={() => {
          enhancePrompt(input, (input) => {
            setInput(input);
            scrollTextArea();
          });
        }}
      />
    );
  },
);

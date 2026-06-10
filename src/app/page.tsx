'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BrainCircuit,
  ChevronRight,
  Layers,
  Menu,
  Send,
  X,
} from 'lucide-react'

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

interface StepProps {
  number: string
  title: string
  description: string
}

export default function TeacheryLandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className='min-h-screen bg-slate-50 font-sans text-slate-800 antialiased'>
      <nav className='fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='flex h-16 items-center justify-between'>
            <Link className='flex items-center space-x-2' href='/'>
              <div className='flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm ring-1 ring-blue-100'>
                <img src='/teachery.svg' alt='Teachery' className='h-full w-full object-contain' />
              </div>
              <span className='text-xl font-bold tracking-tight text-slate-900'>
                Teachery
              </span>
            </Link>

            <div className='hidden items-center space-x-8 md:flex'>
              <a className='text-sm font-medium text-slate-600 transition hover:text-blue-600' href='#features'>Features</a>
              <a className='text-sm font-medium text-slate-600 transition hover:text-blue-600' href='#workflow'>How it Works</a>
              <a className='text-sm font-medium text-slate-600 transition hover:text-blue-600' href='#pricing'>Pricing</a>
              <Link className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700' href='/auth/login'>
                Login
              </Link>
            </div>

            <button
              className='text-slate-600 hover:text-slate-900 md:hidden'
              type='button'
              onClick={() => setIsMenuOpen((current) => !current)}>
              {isMenuOpen ? <X className='h-6 w-6' /> : <Menu className='h-6 w-6' />}
            </button>
          </div>
        </div>

        {isMenuOpen ? (
          <div className='space-y-1 border-b border-slate-200 bg-white px-4 pb-4 pt-2 md:hidden'>
            <a className='block rounded-md px-3 py-2 text-base font-medium text-slate-600 hover:bg-slate-50' href='#features' onClick={() => setIsMenuOpen(false)}>Features</a>
            <a className='block rounded-md px-3 py-2 text-base font-medium text-slate-600 hover:bg-slate-50' href='#workflow' onClick={() => setIsMenuOpen(false)}>How it Works</a>
            <a className='block rounded-md px-3 py-2 text-base font-medium text-slate-600 hover:bg-slate-50' href='#pricing' onClick={() => setIsMenuOpen(false)}>Pricing</a>
            <Link className='mt-2 block rounded-md bg-blue-600 py-2 text-center font-medium text-white transition hover:bg-blue-700' href='/auth/login'>
              Login
            </Link>
          </div>
        ) : null}
      </nav>

      <header className='bg-gradient-to-b from-blue-50 via-white to-slate-50 pb-20 pt-32 md:pb-28 md:pt-40'>
        <div className='mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8'>
          <div className='mb-6 inline-flex items-center space-x-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700'>
            <span>AI-Powered Assessment Builder</span>
          </div>
          <h1 className='mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl md:text-6xl'>
            The Spirit of Teaching, <br />
            <span className='bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'>
              Amplified by AI.
            </span>
          </h1>
          <p className='mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600'>
            Teachery empowers educators to generate smart questions, structure assessments, and publish them to students.
          </p>
          <div className='mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row'>
            <Link className='group flex w-full items-center justify-center space-x-2 rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 sm:w-auto' href='/auth/login'>
              <span>Start Designing Assessments</span>
              <ArrowRight className='h-5 w-5 transition-transform group-hover:translate-x-1' />
            </Link>
            <a className='w-full rounded-xl border border-slate-200 bg-white px-8 py-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto' href='#workflow'>
              See How It Works
            </a>
          </div>
        </div>
      </header>

      <section className='bg-white py-20' id='features'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='mx-auto mb-16 max-w-3xl text-center'>
            <h2 className='text-3xl font-bold text-slate-900 sm:text-4xl'>Everything a teacher needs, in one dashboard.</h2>
            <p className='mt-4 text-slate-600'>Spend less time formatting spreadsheets and more time helping students learn.</p>
          </div>

          <div className='grid grid-cols-1 gap-8 md:grid-cols-3'>
            <FeatureCard
              description='Generate contextual, curriculum-aligned questions with AI in seconds, or manually write trusted classroom problems.'
              icon={<BrainCircuit className='h-6 w-6 text-blue-600' />}
              title='Hybrid Question Bank'
            />
            <FeatureCard
              description='Drag, drop, categorize, and reuse questions across assessments while keeping difficulty balanced.'
              icon={<Layers className='h-6 w-6 text-blue-600' />}
              title='Smart Arrangement'
            />
            <FeatureCard
              description='Publish assessment links to students, collect submissions, and export the materials your classroom needs.'
              icon={<Send className='h-6 w-6 text-blue-600' />}
              title='Instant Publishing'
            />
          </div>
        </div>
      </section>

      <section className='border-y border-slate-200 bg-slate-50 py-20' id='workflow'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='items-center lg:grid lg:grid-cols-12 lg:gap-12'>
            <div className='mb-12 lg:col-span-5 lg:mb-0'>
              <h2 className='text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl'>
                From blank canvas to published test in 3 steps.
              </h2>
              <p className='mt-4 leading-relaxed text-slate-600'>
                Teachery keeps you in editorial control while AI helps with the repetitive drafting work.
              </p>

              <div className='mt-8 space-y-6'>
                <WorkflowStep
                  description='Feed AI a topic, document, or prompt, or simply input your own manual questions.'
                  number='01'
                  title='Generate & Gather'
                />
                <WorkflowStep
                  description='Organize question categories, review answers, and prepare balanced assessments.'
                  number='02'
                  title='Structure the Blueprint'
                />
                <WorkflowStep
                  description='Publish secure assessment links and export teacher-ready documents.'
                  number='03'
                  title='Go Live'
                />
              </div>
            </div>

            <div className='lg:col-span-7'>
              <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl'>
                <div className='flex items-center justify-between bg-slate-900 px-4 py-3 text-white'>
                  <div className='flex items-center space-x-2'>
                    <div className='h-3 w-3 rounded-full bg-red-500' />
                    <div className='h-3 w-3 rounded-full bg-yellow-500' />
                    <div className='h-3 w-3 rounded-full bg-green-500' />
                    <span className='ml-2 font-mono text-xs text-slate-400'>teachery/question-bank</span>
                  </div>
                  <span className='rounded bg-blue-600 px-2 py-0.5 text-xs font-medium text-white'>Drafting Mode</span>
                </div>

                <div className='space-y-4 bg-slate-50 p-6'>
                  <MockQuestion
                    badge='AI Generated'
                    label='Q1'
                    prompt='Explain the process of photosynthesis in your own words.'
                    subject='Biology'
                  />
                  <MockQuestion
                    active
                    badge='Teacher Handcrafted'
                    label='Q2'
                    prompt='Calculate the mass percentage of carbon in Carbon Dioxide (CO2).'
                    subject='Chemistry'
                  />

                  <div className='flex items-center justify-between border-t border-slate-200 pt-4'>
                    <button className='flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:underline' type='button'>
                      <span>+ Add New Question</span>
                    </button>
                    <button className='flex items-center space-x-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow' type='button'>
                      <Send className='h-3 w-3' />
                      <span>Publish Assessment</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='relative overflow-hidden bg-blue-600 py-20 text-white' id='pricing'>
        <div className='absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700 opacity-50' />
        <div className='relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8'>
          <h2 className='text-3xl font-extrabold tracking-tight sm:text-4xl'>
            Ready to transform how you build assessments?
          </h2>
          <p className='mx-auto mt-4 max-w-2xl text-xl text-blue-100'>
            Start with a focused workflow for question generation, review, publishing, and export.
          </p>
          <div className='mt-10 flex justify-center'>
            <Link className='flex items-center space-x-2 rounded-xl bg-white px-8 py-4 font-bold tracking-wide text-blue-700 shadow-lg transition hover:bg-slate-50' href='/auth/login'>
              <span>Create Your First Assessment</span>
              <ChevronRight className='h-5 w-5' />
            </Link>
          </div>
          <p className='mt-4 text-xs text-blue-200'>Log in to open your Teachery dashboard.</p>
        </div>
      </section>

      <footer className='border-t border-slate-800 bg-slate-900 py-12 text-slate-400'>
        <div className='mx-auto flex max-w-7xl flex-col items-center justify-between space-y-4 px-4 sm:px-6 md:flex-row md:space-y-0 lg:px-8'>
          <div className='flex items-center space-x-2'>
            <div className='flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white p-1'>
              <img src='/teachery.svg' alt='Teachery' className='h-full w-full object-contain' />
            </div>
            <span className='text-md font-semibold tracking-tight text-white'>Teachery</span>
          </div>
          <p className='text-xs'>&copy; {new Date().getFullYear()} Teachery. Empowering classrooms.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-slate-50 p-6 transition duration-300 hover:border-blue-300 hover:shadow-md'>
      <div className='mb-4 w-fit rounded-xl border border-slate-200 bg-white p-3 shadow-sm'>
        {icon}
      </div>
      <h3 className='mb-2 text-lg font-bold text-slate-900'>{title}</h3>
      <p className='text-sm leading-relaxed text-slate-600'>{description}</p>
    </div>
  )
}

function WorkflowStep({ number, title, description }: StepProps) {
  return (
    <div className='flex space-x-4'>
      <span className='pt-0.5 font-mono text-xl font-bold tracking-wider text-blue-600/40'>{number}</span>
      <div>
        <h4 className='text-base font-bold text-slate-950'>{title}</h4>
        <p className='mt-1 text-sm text-slate-600'>{description}</p>
      </div>
    </div>
  )
}

function MockQuestion({
  active = false,
  badge,
  label,
  prompt,
  subject,
}: {
  active?: boolean
  badge: string
  label: string
  prompt: string
  subject: string
}) {
  return (
    <div className={`flex items-start space-x-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${active ? 'border-l-4 border-l-blue-600' : ''}`}>
      <span className={`${active ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'} rounded px-2 py-1 text-xs font-bold`}>
        {label}
      </span>
      <div className='flex-1'>
        <p className='text-sm font-semibold text-slate-800'>{prompt}</p>
        <div className='mt-2 flex space-x-2'>
          <span className='rounded border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700'>{badge}</span>
          <span className='rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600'>{subject}</span>
        </div>
      </div>
    </div>
  )
}

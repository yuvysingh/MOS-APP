'use client'
import { login} from './actions'
import Link from 'next/link';

export default function LoginPage() {
  
  return (
    <div className='min-h-screen flex items-center justify-center'>
      <div className=' rounded-lg border border-gray-300 px-32 py-4'>
        <form className='flex flex-col justify-around gap-4'>
          <div className='flex justify-end gap-x-2'>
            <label htmlFor="email" className='py-1 text-gray-500 font-bold'>Email:</label>
            <input id="email" name="email" type="email" className='appearance-none py-1 px-4 border-gray-200 rounded border-2 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-purple-500' required />
          </div>
          <div className='flex justify-end gap-x-2'>
            <label htmlFor="password" className=' py-1 text-gray-500 font-bold'>Password:</label>
            <input id="password" name="password" type="password" className=' appearance-none py-1 px-4  border-gray-200 rounded border-2 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-purple-500'   required />
          </div>
      <button className="shadow bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded " formAction={login}>Log in</button>
      <Link href='/signup' className='text-center text-sm text-gray-800/60 hover:underline'>Dont have an account?</Link>
      </form>
      </div> 
    
    </div>
    
  )
}